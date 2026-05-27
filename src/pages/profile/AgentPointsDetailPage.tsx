import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Coins } from 'lucide-react';

interface RebateRow {
  id: string;
  order_amount: number;
  rebate_pct: number;
  rebate_amount: number;
  credits_amount: number;
  consumed_credits: number;
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

const SOURCE_LABELS: Record<string, string> = { promote: '推广充值', self: '自身充值' };

export default function AgentPointsDetailPage() {
  const { profile } = useAuth();
  const [rows, setRows]     = useState<RebateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetch = async () => {
    if (!profile?.id) return;
    setLoading(true);
    let q = supabase
      .from('rebate_logs')
      .select('*, from_user:from_user_id(username)')
      .eq('agent_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    const { data } = await q;
    setRows((data ?? []) as unknown as RebateRow[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [profile?.id, filterStatus]);

  const frozen    = Number(profile?.rebate_credits_frozen    ?? 0);
  const available = Number(profile?.rebate_credits_available ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Coins className="w-5 h-5 text-primary" />积分明细</h1>
          <p className="text-sm text-muted-foreground mt-0.5">返佣积分的冻结、解冻与提现记录</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
      </div>

      {/* 积分概览 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
          <p className="text-xs text-muted-foreground mb-1">冻结中</p>
          <p className="text-xl font-bold text-amber-400">{frozen.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">积分</p>
        </div>
        <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/5 text-center">
          <p className="text-xs text-muted-foreground mb-1">可提现</p>
          <p className="text-xl font-bold text-green-400">{available.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">≈ ¥{(available / 10).toFixed(2)}</p>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex rounded-lg border border-border overflow-hidden text-sm w-fit">
        {[['all','全部'],['frozen','冻结中'],['available','可提现'],['withdrawn','已提现'],['consumed','已消费']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3 py-1.5 transition-colors ${filterStatus === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}>
            {l}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['来源类型', '来源用户', '充值金额', '返佣金额', '返佣积分', '已消费', '状态', '解冻时间', '时间'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">加载中…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">暂无记录</td></tr>
                ) : rows.map(r => {
                  const s = STATUS_MAP[r.status] ?? STATUS_MAP.frozen;
                  const fu = r.from_user as { username?: string | null } | null;
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {SOURCE_LABELS[r.source_type] ?? r.source_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{fu?.username ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">¥{r.order_amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-primary font-medium">¥{r.rebate_amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{r.credits_amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.consumed_credits}</td>
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
