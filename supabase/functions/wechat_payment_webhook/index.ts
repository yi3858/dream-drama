import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Aes } from 'npm:wechatpay-axios-plugin';
import { corsHeaders, okJson, errJson } from '../_shared/cors.ts';

async function decryptTradeState(
  MCH_API_V3_KEY: string, associatedData: string, nonce: string, ciphertext: string
): Promise<{ status: string; order_no: string }> {
  const plaintext = await Aes.AesGcm.decrypt(ciphertext, MCH_API_V3_KEY, nonce, associatedData);
  const obj = JSON.parse(plaintext);
  return {
    status: (obj.trade_state ?? '').toString() === 'SUCCESS' ? 'SUCCESS' : 'OTHERS',
    order_no: obj.out_trade_no ?? '',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    const { resource } = body;
    if (!resource) return errJson('invalid payload');

    const MCH_API_V3_KEY = Deno.env.get('MCH_API_V3_KEY');
    if (!MCH_API_V3_KEY) return errJson('MCH_API_V3_KEY 未配置', 500);

    const { status, order_no } = await decryptTradeState(
      MCH_API_V3_KEY,
      resource.associated_data ?? '',
      resource.nonce,
      resource.ciphertext
    );
    console.log(`[webhook] order_no=${order_no} status=${status}`);

    if (status !== 'SUCCESS') return okJson({ code: 'SUCCESS', message: '非成功状态，忽略' });

    // 乐观锁更新：仅 pending → paid 执行一次
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('order_no', order_no)
      .eq('status', 'pending')
      .select('id, user_id, order_type, remark, amount, credits')
      .maybeSingle();

    if (updateErr) {
      console.error('[webhook] update error:', updateErr.message);
      return errJson('db error', 500);
    }
    if (!updated) {
      console.log('[webhook] already processed or not found, skip');
      return okJson({ code: 'SUCCESS', message: 'already processed' });
    }

    if (updated.order_type === 'agent_fee') {
      // 从备注中判断升级目标（agent2 或 agent1）
      const isAgent1 = (updated.remark ?? '').includes('一级代理') || (updated.remark ?? '').includes('agent1');
      const newLevel = isAgent1 ? 'agent1' : 'agent2';
      await supabaseAdmin.from('profiles').update({
        agent_level: newLevel,
        agent_fee_paid: true,
        role: newLevel,
      }).eq('id', updated.user_id);
      console.log(`[webhook] user=${updated.user_id} upgraded to ${newLevel}`);
    } else if (updated.order_type === 'credit') {
      // 获取用户当前积分
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits, referrer_id')
        .eq('id', updated.user_id)
        .maybeSingle();
      
      const newBalance = (profile?.credits || 0) + (updated.credits || 0);
      
      // 更新积分
      await supabaseAdmin.from('profiles')
        .update({ credits: newBalance })
        .eq('id', updated.user_id);
        
      // 写入积分日志
      await supabaseAdmin.from('credit_logs').insert({
        user_id: updated.user_id,
        amount: updated.credits,
        balance_after: newBalance,
        type: 'recharge',
        remark: updated.remark || '微信充值积分',
      });
      console.log(`[webhook] user=${updated.user_id} recharged ${updated.credits} credits, new_balance=${newBalance}`);

      // 处理代理返点
      if (profile?.referrer_id) {
        // 查询代理配置与等级
        const { data: referrer } = await supabaseAdmin
          .from('profiles')
          .select('agent_level, id')
          .eq('id', profile.referrer_id)
          .maybeSingle();

        if (referrer && referrer.agent_level !== 'none') {
          // 查询返点比例
          const { data: agentCfg } = await supabaseAdmin
            .from('agent_configs')
            .select('rebate_pct')
            .eq('level', referrer.agent_level)
            .maybeSingle();

          if (agentCfg && agentCfg.rebate_pct > 0) {
            const rebateAmount = Number((updated.amount * (agentCfg.rebate_pct / 100)).toFixed(2));
            if (rebateAmount > 0) {
              await supabaseAdmin.from('rebate_logs').insert({
                agent_id: referrer.id,
                from_user_id: updated.user_id,
                order_id: updated.id,
                order_amount: updated.amount,
                rebate_pct: agentCfg.rebate_pct,
                rebate_amount: rebateAmount,
                status: 'pending'
              });
              console.log(`[webhook] create rebate log for agent=${referrer.id}, amount=${rebateAmount}`);
            }
          }
        }
      }
    }

    return okJson({ code: 'SUCCESS', message: 'ok' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[wechat_payment_webhook] error:', msg);
    return errJson('server error', 500);
  }
});
