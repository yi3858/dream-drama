import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, okJson, errJson } from '../_shared/cors.ts';

const BATCH_SIZE = 200;

Deno.serve(async (req: Request) => {
  // 允许 OPTIONS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 支持定时 cron 调用（无 body）或手动 POST 调用（管理员 Bearer token）
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const now = new Date().toISOString();

  try {
    // ── Step 1: 查询所有到期冻结记录（freeze_until <= now）────────────
    const { data: dueLogs, error: fetchErr } = await supabase
      .from('rebate_logs')
      .select('id, agent_id, credits_amount')
      .eq('status', 'frozen')
      .lte('freeze_until', now)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw new Error(`查询失败: ${fetchErr.message}`);
    if (!dueLogs || dueLogs.length === 0) {
      return okJson({ message: '无需解冻的记录', unfrozen: 0 });
    }

    // ── Step 2: 按代理汇总待解冻积分 ──────────────────────────────────
    const agentMap = new Map<string, number>();
    for (const log of dueLogs) {
      const cur = agentMap.get(log.agent_id) ?? 0;
      agentMap.set(log.agent_id, cur + Number(log.credits_amount));
    }

    const logIds = dueLogs.map(l => l.id);

    // ── Step 3: 批量标记 rebate_logs 为 available ────────────────────
    const { error: updateLogsErr } = await supabase
      .from('rebate_logs')
      .update({ status: 'available' })
      .in('id', logIds);

    if (updateLogsErr) throw new Error(`更新记录失败: ${updateLogsErr.message}`);

    // ── Step 4: 逐代理更新 profiles 积分余额 ─────────────────────────
    const profileUpdates: Promise<unknown>[] = [];
    for (const [agentId, credits] of agentMap.entries()) {
      profileUpdates.push(
        supabase.rpc('fn_unfreeze_rebate_credits', {
          p_user_id: agentId,
          p_credits: credits,
        })
      );
    }
    const results = await Promise.allSettled(profileUpdates);
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('部分代理积分更新失败:', failures);
    }

    console.log(`[unfreeze-rebate-credits] 解冻完成: ${logIds.length} 条记录, ${agentMap.size} 位代理`);

    return okJson({
      message: '解冻完成',
      unfrozen: logIds.length,
      agents: agentMap.size,
      timestamp: now,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[unfreeze-rebate-credits] 错误:', msg);
    return errJson(msg, 500);
  }
});
