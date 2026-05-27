import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Users, TrendingUp, Coins, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiData {
  totalUsers:     number;
  monthlyNew:     number;
  totalRebate:    number;
  pendingCredits: number;
}

interface BarRow {
  date: string;
  新增用户: number;
  返佣积分: number;
}

interface Props {
  agentId: string;
  rebatePct: number;
  agentLevel: string;
  fee: number;
}

const LEVEL_FEE: Record<string, { next: string; nextFee: number }> = {
  agent2: { next: '一级代理', nextFee: 999 },
};

export default function AgentStatsPanel({ agentId, rebatePct, agentLevel, fee }: Props) {
  const [kpi, setKpi]         = useState<KpiData | null>(null);
  const [barData, setBarData] = useState<BarRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 86400_000).toISOString().slice(0, 10);

    Promise.all([
      // 总推广人数
      supabase
        .from('rebate_logs')
        .select('from_user_id', { count: 'exact', head: false })
        .eq('agent_id', agentId)
        .eq('source_type', 'promote'),

      // 本月新增推广人数
      supabase
        .from('rebate_logs')
        .select('from_user_id', { count: 'exact', head: false })
        .eq('agent_id', agentId)
        .eq('source_type', 'promote')
        .gte('created_at', monthStart),

      // 累计返佣积分
      supabase
        .from('rebate_logs')
        .select('credits_amount')
        .eq('agent_id', agentId),

      // 待结算（冻结）
      supabase
        .from('rebate_logs')
        .select('credits_amount')
        .eq('agent_id', agentId)
        .eq('status', 'frozen'),

      // 近7天柱状图
      supabase
        .from('rebate_weekly_stats')
        .select('stat_date,new_users,credits_earned')
        .eq('agent_id', agentId)
        .gte('stat_date', weekAgo)
        .order('stat_date', { ascending: true }),
    ]).then(([totalRes, monthRes, allRes, frozenRes, weekRes]) => {
      // 去重 unique users
      const uniqueTotal = new Set((totalRes.data ?? []).map((r: { from_user_id: string }) => r.from_user_id)).size;
      const uniqueMonth = new Set((monthRes.data ?? []).map((r: { from_user_id: string }) => r.from_user_id)).size;
      const totalRebate = (allRes.data ?? []).reduce((s: number, r: { credits_amount: number }) => s + Number(r.credits_amount), 0);
      const pending     = (frozenRes.data ?? []).reduce((s: number, r: { credits_amount: number }) => s + Number(r.credits_amount), 0);

      setKpi({ totalUsers: uniqueTotal, monthlyNew: uniqueMonth, totalRebate, pendingCredits: pending });

      // 填充7天数据
      const map = new Map<string, { new_users: number; credits_earned: number }>();
      (weekRes.data ?? []).forEach((r: { stat_date: string; new_users: number; credits_earned: number }) => map.set(r.stat_date, r));

      const bars: BarRow[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key   = d.toISOString().slice(0, 10);
        const label = `${String(d.getMonth() + 1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
        const row = map.get(key);
        bars.push({ date: label, 新增用户: row?.new_users ?? 0, 返佣积分: row?.credits_earned ?? 0 });
      }
      setBarData(bars);
      setLoading(false);
    });
  }, [agentId]);

  const KpiCard = ({ icon: Ico, label, value, sub, color }: { icon: typeof Users; label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="p-3 rounded-xl border border-border bg-card space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Ico className="w-3.5 h-3.5 shrink-0" />{label}
      </div>
      <p className={`text-xl font-bold ${color ?? 'text-foreground'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-2.5 shadow-md text-xs space-y-1">
        <p className="font-medium mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}：</span>
            <span className="font-medium">{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const upgradeInfo = LEVEL_FEE[agentLevel];
  const totalRebateYuan = (kpi?.totalRebate ?? 0) / 10;

  return (
    <div className="space-y-4">
      {/* KPI 卡片组 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users}     label="累计推广人数" value={kpi?.totalUsers ?? 0}     sub="通过推广链接注册" />
        <KpiCard icon={TrendingUp} label="本月新增人数" value={kpi?.monthlyNew ?? 0}     sub="本月推广转化"       color="text-primary" />
        <KpiCard icon={Coins}      label="累计返佣积分" value={kpi?.totalRebate ?? 0}    sub={`≈ ¥${totalRebateYuan.toFixed(0)}`} color="text-amber-400" />
        <KpiCard icon={Clock}      label="待结算积分"   value={kpi?.pendingCredits ?? 0} sub="冻结中，T+15解冻"  color="text-muted-foreground" />
      </div>

      {/* 近7天柱状图 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            近7天推广数据
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left"  dataKey="新增用户" fill="#6366f1" radius={[3,3,0,0]} maxBarSize={28} />
                <Bar yAxisId="right" dataKey="返佣积分" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#6366f1] shrink-0" />新增用户（左轴）</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] shrink-0" />返佣积分（右轴）</div>
          </div>
        </CardContent>
      </Card>

      {/* 等级升级进度（仅二级代理展示） */}
      {upgradeInfo && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">升级进度 → {upgradeInfo.next}</p>
              <p className="text-xs text-muted-foreground">差额 ¥{Math.max(0, upgradeInfo.nextFee - fee)}</p>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (fee / upgradeInfo.nextFee) * 100).toFixed(0)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
              <span>已缴 ¥{fee}</span>
              <span>目标 ¥{upgradeInfo.nextFee}</span>
            </div>
            <p className="text-xs text-amber-400 mt-2">升级至一级代理可享 15% 返点，较当前提升 {15 - rebatePct}%</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
