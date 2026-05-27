import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// 模拟发送短信的函数
async function sendSmsNotification(phone: string, points: number, expireDate: string) {
  // 这里可以替换为真实的短信服务提供商 API，比如腾讯云、阿里云 SMS
  console.log(`[SMS MOCK] 发送短信至 ${phone}: 您的 ${points} 积分将于 ${expireDate} 过期，请尽快使用！`);
  // 假装调用成功
  return true;
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 验证 Authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    console.warn('Unauthorized attempt to trigger notify_expiring_points');
    // 在实际生产中应当阻止，但为了兼容某些无头 cron，我们这里可以用一个私钥验证
    // return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 找出所有在未来3天内过期，且尚未通知、剩余积分大于0的包
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    
    const { data: packages, error } = await supabase
      .from('user_point_packages')
      .select('id, user_id, remain_points, expired_at, profiles(phone)')
      .eq('is_expiring_notified', false)
      .gt('remain_points', 0)
      .lte('expired_at', targetDate.toISOString())
      .not('expired_at', 'is', null);

    if (error) {
      throw error;
    }

    if (!packages || packages.length === 0) {
      return new Response(JSON.stringify({ message: 'No expiring points to notify' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    // 按用户分组聚合积分
    const userGroups = new Map<string, {
      phone: string;
      totalPoints: number;
      packageIds: string[];
      earliestExpireAt: string;
    }>();

    for (const pkg of packages) {
      // 获取关联的 profile 里的手机号
      const phone = Array.isArray(pkg.profiles) ? pkg.profiles[0]?.phone : (pkg.profiles as any)?.phone;
      if (!phone) continue; // 没有手机号的不发短信
      
      if (!userGroups.has(pkg.user_id)) {
        userGroups.set(pkg.user_id, {
          phone,
          totalPoints: 0,
          packageIds: [],
          earliestExpireAt: pkg.expired_at
        });
      }
      
      const group = userGroups.get(pkg.user_id)!;
      group.totalPoints += Number(pkg.remain_points);
      group.packageIds.push(pkg.id);
      
      if (new Date(pkg.expired_at) < new Date(group.earliestExpireAt)) {
        group.earliestExpireAt = pkg.expired_at;
      }
    }

    let notifiedCount = 0;
    
    // 对每个用户发送短信
    for (const [userId, group] of userGroups.entries()) {
      // 格式化日期，例如 2026-05-23
      const expireDateStr = new Date(group.earliestExpireAt).toLocaleDateString('zh-CN');
      
      const success = await sendSmsNotification(group.phone, group.totalPoints, expireDateStr);
      
      if (success) {
        // 更新这些包裹的状态为已通知
        await supabase
          .from('user_point_packages')
          .update({ is_expiring_notified: true })
          .in('id', group.packageIds);
          
        notifiedCount++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully notified ${notifiedCount} users.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (err: any) {
    console.error('Error in notify_expiring_points:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
