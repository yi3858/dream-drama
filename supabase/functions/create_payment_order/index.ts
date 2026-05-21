import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Wechatpay } from 'npm:wechatpay-axios-plugin';
import ShortUniqueId from 'npm:short-unique-id';
import { corsHeaders, okJson, errJson } from '../_shared/cors.ts';

function generateOrderNo(): string {
  const uid = new ShortUniqueId({ length: 8 });
  const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `ORD-${yymmdd}-${uid.rnd()}`;
}

async function createWechatPayUrl(
  MERCHANT_ID: string, MERCHANT_APP_ID: string, MCH_CERT_SERIAL_NO: string,
  MCH_PRIVATE_KEY: string, WECHAT_PAY_PUBLIC_KEY_ID: string, WECHAT_PAY_PUBLIC_KEY: string,
  outTradeNo: string, amount: number, notifyUrl: string
) {
  try {
    const wxpay = new Wechatpay({
      mchid: MERCHANT_ID,
      serial: MCH_CERT_SERIAL_NO,
      privateKey: MCH_PRIVATE_KEY,
      certs: { [WECHAT_PAY_PUBLIC_KEY_ID]: WECHAT_PAY_PUBLIC_KEY },
    });
    const res = await wxpay.v3.pay.transactions.native.post({
      mchid: MERCHANT_ID,
      out_trade_no: outTradeNo,
      appid: MERCHANT_APP_ID,
      description: '漫绘星球 - 代理费',
      notify_url: notifyUrl,
      amount: { total: Math.round(amount * 100) },
    }, { headers: { 'Wechatpay-Serial': WECHAT_PAY_PUBLIC_KEY_ID } });
    if (res.data.code_url) {
      console.log(`[WeChatPay SUCCESS] outTradeNo=${outTradeNo}, url=${res.data.code_url}`);
      return { success: true, url: res.data.code_url };
    } else {
      console.error(`[WeChatPay FAILED] outTradeNo=${outTradeNo}, error=${res.data.message || JSON.stringify(res.data)}`);
      return { success: false, error: res.data.message || JSON.stringify(res.data) };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WeChatPay ERROR] outTradeNo=${outTradeNo}, error=${msg}`);
    return { success: false, error: msg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errJson('未授权', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 验证登录用户
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return errJson('未授权', 401);

    const { agent_config_id, contact_info, reason } = await req.json();
    if (!agent_config_id) return errJson('缺少 agent_config_id');

    // 获取代理配置
    const { data: agentCfg, error: cfgErr } = await supabaseAdmin
      .from('agent_configs')
      .select('*')
      .eq('id', agent_config_id)
      .maybeSingle();
    if (cfgErr || !agentCfg) return errJson('代理配置不存在');

    // 获取当前用户 profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('agent_level, role')
      .eq('id', user.id)
      .maybeSingle();

    const currentLevel = profile?.agent_level ?? 'none';
    const isUpgrading = agentCfg.level === 'agent1' && currentLevel === 'agent2';

    // 计算实付金额（升级补差价）
    let actualAmount = agentCfg.fee;
    if (isUpgrading) {
      const { data: agent2Cfg } = await supabaseAdmin
        .from('agent_configs')
        .select('fee')
        .eq('level', 'agent2')
        .maybeSingle();
      actualAmount = Math.max(0, agentCfg.fee - (agent2Cfg?.fee ?? 0));
    }

    // 读取微信支付密钥
    const MERCHANT_ID = Deno.env.get('MERCHANT_ID');
    const MERCHANT_APP_ID = Deno.env.get('MERCHANT_APP_ID');
    const MCH_CERT_SERIAL_NO = Deno.env.get('MCH_CERT_SERIAL_NO');
    const MCH_PRIVATE_KEY = Deno.env.get('MCH_PRIVATE_KEY');
    const WECHAT_PAY_PUBLIC_KEY_ID = Deno.env.get('WECHAT_PAY_PUBLIC_KEY_ID');
    const WECHAT_PAY_PUBLIC_KEY = Deno.env.get('WECHAT_PAY_PUBLIC_KEY');

    if (!MERCHANT_ID || !MERCHANT_APP_ID || !MCH_CERT_SERIAL_NO || !MCH_PRIVATE_KEY || !WECHAT_PAY_PUBLIC_KEY_ID || !WECHAT_PAY_PUBLIC_KEY) {
      return errJson('微信支付密钥未配置，请在插件中心配置支付密钥', 500);
    }

    const orderNo = generateOrderNo();
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wechat_payment_webhook`;

    // 生成微信支付二维码
    const payResult = await createWechatPayUrl(
      MERCHANT_ID, MERCHANT_APP_ID, MCH_CERT_SERIAL_NO, MCH_PRIVATE_KEY,
      WECHAT_PAY_PUBLIC_KEY_ID, WECHAT_PAY_PUBLIC_KEY,
      orderNo, actualAmount, notifyUrl
    );
    if (!payResult.success) return errJson(`微信支付创建失败：${payResult.error}`, 500);

    // 写入订单（service role 跳过 RLS user_id check）
    const { error: insertErr } = await supabaseAdmin.from('orders').insert({
      order_no: orderNo,
      user_id: user.id,
      amount: actualAmount,
      credits: 0,
      status: 'pending',
      order_type: 'agent_fee',
      pay_method: 'wechat',
      wechat_pay_url: payResult.url,
      remark: isUpgrading
        ? `升级${agentCfg.name}（补差价 ¥${actualAmount}）- ${contact_info ?? ''}${reason ? ' | ' + reason : ''}`
        : `申请${agentCfg.name} - ${contact_info ?? ''}${reason ? ' | ' + reason : ''}`,
    });
    if (insertErr) return errJson(`订单创建失败：${insertErr.message}`, 500);

    return okJson({
      order_no: orderNo,
      wechat_pay_url: payResult.url,
      amount: actualAmount,
      agent_name: agentCfg.name,
      is_upgrade: isUpgrading,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[create_payment_order] unexpected error:', msg);
    return errJson('服务器错误', 500);
  }
});
