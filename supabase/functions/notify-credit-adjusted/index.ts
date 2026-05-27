import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, okJson, errJson } from "../_shared/cors.ts";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errJson("Method Not Allowed", 405);

  // 从请求体获取参数
  let userId: string, phone: string, delta: number, balanceAfter: number, remark: string, mode: "add" | "sub";
  try {
    const body = await req.json();
    userId = body.userId;
    phone = body.phone;
    delta = Number(body.delta);
    balanceAfter = Number(body.balanceAfter);
    remark = body.remark ?? "";
    mode = body.mode === "sub" ? "sub" : "add";
    if (!userId || !phone || isNaN(delta)) throw new Error("参数不完整");
  } catch (e) {
    return errJson(`参数错误: ${e instanceof Error ? e.message : e}`, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");

  const supabase = createClient(supabaseUrl, serviceKey);

  const absDelta = Math.abs(delta);
  const actionWord = mode === "add" ? "充值到账" : "积分扣减";
  const title = `积分${actionWord}通知`;
  const content = mode === "add"
    ? `您好！您的账户已成功充值 ${absDelta.toLocaleString()} 积分。${remark ? `（备注：${remark}）` : ""} 当前积分余额：${balanceAfter.toLocaleString()} 积分。`
    : `您的账户已扣减 ${absDelta.toLocaleString()} 积分。${remark ? `（备注：${remark}）` : ""} 当前积分余额：${balanceAfter.toLocaleString()} 积分。`;

  // 1. 写入站内通知
  const { error: notifErr } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    content,
  });
  if (notifErr) {
    console.error("站内通知写入失败:", notifErr.message);
  }

  // 2. 发送短信通知（仅积分增加时发送，且需要有 apiKey 和手机号）
  let smsResult: { success: boolean; message: string } = { success: false, message: "未发送" };
  if (mode === "add" && phone && apiKey) {
    // 短信文案（控制在 70 字内）
    const smsContent = `【积分到账】您已成功充值${absDelta}积分，当前余额${balanceAfter}积分。${remark ? `备注:${remark}` : ""}`;
    try {
      const smsResp = await fetch(
        "https://app-brhf2ms7ez29-api-W9z3M74x6ZNL-gateway.appmiaoda.com/v1/code/send_message",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Gateway-Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ mobile: phone }),
        }
      );
      const smsData = await smsResp.json();
      if (smsData.status === 0) {
        smsResult = { success: true, message: "短信发送成功" };
      } else {
        smsResult = { success: false, message: smsData.msg ?? "短信发送失败" };
        console.error("短信发送失败:", smsData);
      }
    } catch (e) {
      smsResult = { success: false, message: `短信发送异常: ${e instanceof Error ? e.message : e}` };
      console.error("短信发送异常:", e);
    }
  }

  return okJson({
    success: true,
    notification: !notifErr,
    sms: smsResult,
  });
});
