import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
import { corsHeaders } from "../_shared/cors.ts";

interface InvitePayload {
  inviteCode: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { inviteCode } = await req.json() as InvitePayload;
    if (!inviteCode) {
      throw new Error('邀请码不能为空');
    }

    // 1. 检查是否已经绑定过
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('inviter_id')
      .eq('id', user.id)
      .single();

    if (profile?.inviter_id) {
      return new Response(
        JSON.stringify({ error: '您已经绑定过邀请人' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. 查找邀请人
    const { data: inviter } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (!inviter) {
      return new Response(
        JSON.stringify({ error: '无效的邀请码' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (inviter.id === user.id) {
      return new Response(
        JSON.stringify({ error: '不能邀请自己' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. 获取积分配置
    const { data: configs } = await supabaseClient
      .from('point_configs')
      .select('key, value');
    
    const configMap = configs?.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, number>) || {};

    const inviterReward = configMap['invite_inviter_reward'] || 20;
    const inviteeReward = configMap['invite_invitee_reward'] || 20;
    const validityDays = configMap['reward_validity_days'] || 30;

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + validityDays);
    const expiredAtStr = expiredAt.toISOString();

    // 4. 更新被邀请人的 inviter_id
    await supabaseClient
      .from('profiles')
      .update({ inviter_id: inviter.id })
      .eq('id', user.id);

    // 5. 记录邀请关系
    const { data: inviteRecord, error: recordError } = await supabaseClient
      .from('invite_records')
      .insert({
        inviter_id: inviter.id,
        invitee_id: user.id,
        inviter_reward: inviterReward,
        invitee_reward: inviteeReward,
      })
      .select()
      .single();

    if (recordError) throw recordError;

    // 6. 发放积分
    // 邀请人积分包
    await supabaseClient.from('user_point_packages').insert({
      user_id: inviter.id,
      total_points: inviterReward,
      remain_points: inviterReward,
      point_type: 'gift',
      source_type: 'invite',
      source_id: inviteRecord.id,
      expired_at: expiredAtStr
    });
    // 记录邀请人流水
    await supabaseClient.from('credit_logs').insert({
      user_id: inviter.id,
      amount: inviterReward,
      description: '邀请好友奖励',
      source: inviteRecord.id,
      p_type: 'gift',
      expired_at: expiredAtStr
    });
    // 更新邀请人总分
    await supabaseClient.rpc('increment_profile_credits', {
      p_user_id: inviter.id,
      p_amount: inviterReward
    });

    // 被邀请人积分包
    await supabaseClient.from('user_point_packages').insert({
      user_id: user.id,
      total_points: inviteeReward,
      remain_points: inviteeReward,
      point_type: 'gift',
      source_type: 'invite',
      source_id: inviteRecord.id,
      expired_at: expiredAtStr
    });
    // 记录被邀请人流水
    await supabaseClient.from('credit_logs').insert({
      user_id: user.id,
      amount: inviteeReward,
      description: '填写邀请码奖励',
      source: inviteRecord.id,
      p_type: 'gift',
      expired_at: expiredAtStr
    });
    // 更新被邀请人总分
    await supabaseClient.rpc('increment_profile_credits', {
      p_user_id: user.id,
      p_amount: inviteeReward
    });

    return new Response(
      JSON.stringify({ success: true, reward: inviteeReward }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
