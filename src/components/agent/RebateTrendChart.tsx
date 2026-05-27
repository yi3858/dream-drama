import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface DayStat {
  stat_date: string;
  total_credits: number;
  frozen_credits: number;
  available_credits: number;
  withdrawn_credits: number;
}

interface ChartRow {
  date: string;
  冻结积分: number;
  可提现积分: number;
  已提现积分: number;
}

interface Props {
  agentId: string;
}

export default function RebateTrendChart({ agentId }: Props) {
  const [data, setData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;

    const since = new Date();
    since.setDate(since.getDate() - 29);

    supabase
      .from('rebate_daily_stats')
      .select('stat_date,frozen_credits,available_credits,withdrawn_credits')
      .eq('agent_id', agentId)
      .gte('stat_date', since.toISOString().slice(0, 10))
      .order('stat_date', { ascending: true })
      .then(({ data: rows }) => {
        if (!rows) { setLoading(false); return; }

        // 填充近30天的每日数据，缺失日期补0
        const map = new Map<string, DayStat>();
        (rows as DayStat[]).forEach(r => map.set(r.stat_date, r));

        const chart: ChartRow[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
          const row = map.get(key);
          chart.push({
            date: label,
            冻结积分:  Number(row?.frozen_credits    ?? 0),
            可提现积分: Number(row?.available_credits ?? 0),
            已提现积分: Number(row?.withdrawn_credits ?? 0),
          });
        }
        setData(chart);
        setLoading(false);
      });
  }, [agentId]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-md text-xs space-y-1">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}：</span>
            <span className="font-medium text-foreground">{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          近30天返佣积分趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">加载中…</div>
        ) : (
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFrozen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAvailable" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWithdrawn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval={4}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="horizontal" wrapperStyle={{ paddingTop: 12, fontSize: 11 }} />
                <Area type="monotone" dataKey="冻结积分"  stroke="#f59e0b" fill="url(#gFrozen)"    strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="可提现积分" stroke="#22c55e" fill="url(#gAvailable)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="已提现积分" stroke="#8b5cf6" fill="url(#gWithdrawn)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
