import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { TrendingUp, Copy, Users, RefreshCw, Calendar, BarChart3 } from 'lucide-react';

interface DayStat {
  stat_date: string;
  copy_count: number;
  unique_users: number;
}

interface SummaryStats {
  total_7d: number;
  total_30d: number;
  unique_users_30d: number;
  today: number;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<DayStat[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({ total_7d: 0, total_30d: 0, unique_users_30d: 0, today: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    // 取最近 30 天的每日统计（从视图查询）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const since = thirtyDaysAgo.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('analytics_daily_copy')
      .select('stat_date, copy_count, unique_users')
      .gte('stat_date', since)
      .order('stat_date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('统计查询失败:', error.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    setStats(rows);

    // 计算汇总数据
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const since7 = sevenDaysAgo.toISOString().slice(0, 10);

    const todayRow = rows.find(r => r.stat_date === today);
    const total30 = rows.reduce((s, r) => s + Number(r.copy_count), 0);
    const total7 = rows.filter(r => r.stat_date >= since7).reduce((s, r) => s + Number(r.copy_count), 0);
    const uniqueUsers30 = rows.reduce((s, r) => s + Number(r.unique_users), 0);

    setSummary({
      today: todayRow ? Number(todayRow.copy_count) : 0,
      total_7d: total7,
      total_30d: total30,
      unique_users_30d: uniqueUsers30,
    });

    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // 最大值（用于绘制相对柱状图）
  const maxCount = Math.max(...stats.map(s => Number(s.copy_count)), 1);

  // 日期格式化
  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  const summaryCards = [
    { label: '今日复制次数', value: summary.today, icon: Copy, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: '近7日复制次数', value: summary.total_7d, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: '近30日复制次数', value: summary.total_30d, icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
    { label: '近30日触达人数', value: summary.unique_users_30d, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> 充值转化统计
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            统计用户点击"一键复制微信号"的行为，评估充值意向与转化率
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </Button>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label} className="h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground text-balance">{card.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                    {loading ? '—' : card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 每日趋势 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> 近30天每日复制次数
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : stats.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Copy className="w-10 h-10 opacity-20" />
              <p className="text-sm">暂无复制行为数据</p>
              <p className="text-xs">用户点击充值弹窗中的"一键复制"后，数据将在此显示</p>
            </div>
          ) : (
            <>
              {/* 柱状图（纯 CSS） */}
              <div className="overflow-x-auto pb-1">
                <div className="flex items-end gap-1 min-w-0" style={{ minWidth: `${stats.length * 28}px`, height: '160px' }}>
                  {[...stats].reverse().map(s => {
                    const pct = (Number(s.copy_count) / maxCount) * 100;
                    return (
                      <div key={s.stat_date} className="flex flex-col items-center gap-1 flex-1 min-w-0 group" title={`${s.stat_date}: ${s.copy_count} 次`}>
                        <span className="text-[10px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {s.copy_count}
                        </span>
                        <div className="w-full rounded-t-sm bg-primary/20 group-hover:bg-primary/80 transition-colors"
                          style={{ height: `${Math.max(pct * 1.2, 4)}px` }}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* X 轴标签 */}
                <div className="flex gap-1 mt-1" style={{ minWidth: `${stats.length * 28}px` }}>
                  {[...stats].reverse().map((s, i) => (
                    <div key={s.stat_date} className="flex-1 min-w-0 text-center">
                      {(i % Math.max(1, Math.floor(stats.length / 10)) === 0) && (
                        <span className="text-[9px] text-muted-foreground">{fmtDate(s.stat_date)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 明细表 */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">日期</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">复制次数</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">触达用户数</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">占比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.map(s => (
                      <tr key={s.stat_date} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-mono text-xs">{s.stat_date}</td>
                        <td className="py-2 px-3 text-right font-semibold text-primary">
                          {Number(s.copy_count).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">
                          {Number(s.unique_users).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(Number(s.copy_count) / maxCount) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {Math.round((Number(s.copy_count) / maxCount) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 说明 */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">统计说明：</strong>
            "复制次数" 表示当日所有用户点击充值弹窗中"一键复制微信号"按钮的总次数；
            "触达用户数" 表示产生复制行为的独立登录用户数（未登录用户不计入）。
            此数据可用于评估充值意向热度与客服转化率。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
