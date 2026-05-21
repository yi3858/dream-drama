import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Aes } from 'npm:wechatpay-axios-plugin';
import { corsHeaders, okJson, errJson } from '../_shared/cors.ts';

async function decryptRefundState(
  MCH_API_V3_KEY: string, associatedData: string, nonce: string, ciphertext: string
): Promise<{ refundStatus: string; outTradeNo: string; outRefundNo: string }> {
  const plaintext = await Aes.AesGcm.decrypt(ciphertext, MCH_API_V3_KEY, nonce, associatedData);
  const obj = JSON.parse(plaintext);
  return {
    refundStatus: (obj.refund_status ?? '').toString() === 'SUCCESS' ? 'SUCCESS' : 'OTHERS',
    outTradeNo: obj.out_trade_no ?? '',
    outRefundNo: obj.out_refund_no ?? '',
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

    const { refundStatus, outTradeNo, outRefundNo } = await decryptRefundState(
      MCH_API_V3_KEY,
      resource.associated_data ?? '',
      resource.nonce,
      resource.ciphertext
    );
    console.log(`[refund_webhook] order_no=${outTradeNo} refund_no=${outRefundNo} status=${refundStatus}`);

    if (refundStatus !== 'SUCCESS') return okJson({ code: 'SUCCESS', message: '非成功状态，忽略' });

    // 查询订单已有 status，确保幂等
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('status, refund_no')
      .eq('order_no', outTradeNo)
      .maybeSingle();

    if (!order) return okJson({ code: 'SUCCESS', message: 'order not found' });
    if (order.status === 'refunded') {
      console.log('[refund_webhook] already refunded, skip');
      return okJson({ code: 'SUCCESS', message: 'already refunded' });
    }

    // 退款回调只做最终确认，execute_refund_directly 已写库
    console.log(`[refund_webhook] refund confirmed for order=${outTradeNo}`);
    return okJson({ code: 'SUCCESS', message: 'ok' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[wechat_refund_webhook] error:', msg);
    return errJson('server error', 500);
  }
});
