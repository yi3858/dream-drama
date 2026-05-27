import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Wechatpay } from 'npm:wechatpay-axios-plugin';
import ShortUniqueId from 'npm:short-unique-id';
import { corsHeaders, okJson, errJson } from '../_shared/cors.ts';

function generateRefundNo(): string {
  const uid = new ShortUniqueId({ length: 8 });
  const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `REF-${yymmdd}-${uid.rnd()}`;
}

async function createWechatRefund(
  wxpay: InstanceType<typeof Wechatpay>,
  WECHAT_PAY_PUBLIC_KEY_ID: string,
  outTradeNo: string, outRefundNo: string,
  refundAmount: number, totalAmount: number,
  notifyUrl: string, reason: string
) {
  try {
    const { data } = await wxpay.v3.refund.domestic.refunds.post(
      {
        out_trade_no: outTradeNo,
        out_refund_no: outRefundNo,
        reason: reason || '退款',
        notify_url: notifyUrl,
        amount: {
          refund: Math.round(refundAmount * 100),
          total: Math.round(totalAmount * 100),
          currency: 'CNY',
        },
      },
      { headers: { 'Wechatpay-Serial': WECHAT_PAY_PUBLIC_KEY_ID } }
    );
    console.log(`[WeChatPay REFUND SUCCESS] outTradeNo=${outTradeNo}, outRefundNo=${outRefundNo}, refundId=${data.refund_id}`);
    return { success: true, data };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const wxError = (err as { response?: { data?: unknown } })?.response?.data;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WeChatPay REFUND ERROR] outTradeNo=${outTradeNo} outRefundNo=${outRefundNo} wxpayError=${wxError ? JSON.stringify(wxError) : 'N/A'} message=${msg}`);
    return { success: false, error: wxError || msg };
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

    // 验证管理员身份
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return errJson('未授权', 401);
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') return errJson('无管理员权限', 403);

    const { order_no, refund_amount, reason } = await req.json();
    if (!order_no || !refund_amount) return errJson('缺少 order_no 或 refund_amount');

    // 查询订单
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('order_no, amount, status, user_id, order_type, credits')
      .eq('order_no', order_no)
      .maybeSingle();
    if (!order) return errJson('订单不存在');
    if (order.status !== 'paid') return errJson('订单状态不允许退款');
    if (refund_amount > order.amount) return errJson('退款金额超过订单金额');

    // 读取微信支付密钥
    const MERCHANT_ID = Deno.env.get('MERCHANT_ID');
    const MCH_CERT_SERIAL_NO = Deno.env.get('MCH_CERT_SERIAL_NO');
    const MCH_PRIVATE_KEY = Deno.env.get('MCH_PRIVATE_KEY');
    const WECHAT_PAY_PUBLIC_KEY_ID = Deno.env.get('WECHAT_PAY_PUBLIC_KEY_ID');
    const WECHAT_PAY_PUBLIC_KEY = Deno.env.get('WECHAT_PAY_PUBLIC_KEY');
    if (!MERCHANT_ID || !MCH_CERT_SERIAL_NO || !MCH_PRIVATE_KEY || !WECHAT_PAY_PUBLIC_KEY_ID || !WECHAT_PAY_PUBLIC_KEY) {
      return errJson('微信支付密钥未配置', 500);
    }

    const wxpay = new Wechatpay({
      mchid: MERCHANT_ID,
      serial: MCH_CERT_SERIAL_NO,
      privateKey: MCH_PRIVATE_KEY,
      certs: { [WECHAT_PAY_PUBLIC_KEY_ID]: WECHAT_PAY_PUBLIC_KEY },
    });

    const outRefundNo = generateRefundNo();
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wechat_refund_webhook`;

    const result = await createWechatRefund(
      wxpay, WECHAT_PAY_PUBLIC_KEY_ID,
      order_no, outRefundNo,
      refund_amount, order.amount,
      notifyUrl, reason || '管理员退款'
    );
    if (!result.success) return errJson(`退款申请失败：${JSON.stringify(result.error)}`, 500);

    const isFullRefund = refund_amount >= order.amount;
    const newStatus = isFullRefund ? 'refunded' : 'partial_refunded';

    // 更新订单状态（乐观锁：仅 paid 状态才执行）
    await supabaseAdmin.from('orders').update({
      status: newStatus,
      refund_amount,
      refund_no: outRefundNo,
    }).eq('order_no', order_no).eq('status', 'paid');

    // agent_fee 退款：撤销代理资格
    if (isFullRefund && order.order_type === 'agent_fee') {
      await supabaseAdmin.from('profiles').update({
        agent_level: 'none',
        agent_fee_paid: false,
        role: 'user',
      }).eq('id', order.user_id);
    }

    // credit 退款：扣回积分
    if (order.order_type === 'credit' && order.credits > 0) {
      const refundCredits = isFullRefund ? order.credits : Math.floor(order.credits * refund_amount / order.amount);
      await supabaseAdmin.rpc('deduct_credits', { user_id: order.user_id, amount: refundCredits });
    }

    return okJson({ success: true, refund_no: outRefundNo, status: newStatus });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[execute_refund_directly] error:', msg);
    return errJson('服务器错误', 500);
  }
});
