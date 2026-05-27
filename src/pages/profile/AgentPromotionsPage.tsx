import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Users } from 'lucide-react';

interface RebateRow {
  id: string;
  from_user_id: string;
  order_amount: number;
  rebate_pct: number;
  credits_amount: number;
  source_type: string;
  status: string;
  freeze_until: string | null;
  created_at: string;
  from_user?: { username: string | null } | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  frozen:    { label: '冻结中',  cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  available: { label: '可提现', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  withdrawn: { label: '已提现', cls: 'bg-muted/50 text-muted-foreground border-border' },
  consumed:  { label: '已消费', cls: 'bg-muted/50 text-muted-foreground border-border' },
};

export default function AgentPromotionsPage() {
  const { profile } = useAuth();
  const [rows, setRows]     = useState<RebateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('rebate_logs')
      .select('*, from_user:from_user_id(username)')
      .eq('agent_id', profile.id)
      .eq('source_type', 'promote')
      .order('created_at', { ascending: false })
      .limit(100);
    setRows((data ?? []) as unknown as RebateRow[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [profile?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" />推广记录</h1>
          <p className="text-sm text-muted-foreground mt-0.5">通过推广链接充值的用户记录</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['用户', '充值金额', '返点%', '返佣积分', '积分状态', '解冻时间', '时间'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">加载中…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">暂无推广记录</td></tr>
                ) : rows.map(r => {
                  const s = STATUS_MAP[r.status] ?? STATUS_MAP.frozen;
                  const fu = r.from_user as { username?: string | null } | null;
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{fu?.username ?? '匿名用户'}</td>
                      <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">¥{r.order_amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.rebate_pct}%</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{r.credits_amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {r.freeze_until ? new Date(r.freeze_until).toLocaleDateString('zh-CN') : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
