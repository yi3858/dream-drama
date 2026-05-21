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
      .select('id, user_id, order_type, remark, amount')
      .maybeSingle();

    if (updateErr) {
      console.error('[webhook] update error:', updateErr.message);
      return errJson('db error', 500);
    }
    if (!updated) {
      console.log('[webhook] already processed or not found, skip');
      return okJson({ code: 'SUCCESS', message: 'already processed' });
    }

    // 仅 agent_fee 类型订单需要升级代理等级
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
    }

    return okJson({ code: 'SUCCESS', message: 'ok' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[wechat_payment_webhook] error:', msg);
    return errJson('server error', 500);
  }
});
