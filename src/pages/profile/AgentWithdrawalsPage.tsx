import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, History } from 'lucide-react';

interface WithdrawalRow {
  id: string;
  amount: number;
  credits_amount: number;
  status: string;
  account_info: { type: string; account: string; name: string };
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:  { label: '待审核', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved: { label: '已通过', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  paid:     { label: '已打款', cls: 'bg-primary/10 text-primary border-primary/20' },
  rejected: { label: '已拒绝', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function AgentWithdrawalsPage() {
  const { profile } = useAuth();
  const [rows, setRows]     = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('agent_id', profile.id)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as unknown as WithdrawalRow[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [profile?.id]);

  const ACCT_TYPE: Record<string, string> = { wechat: '微信', alipay: '支付宝', bank: '银行卡' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5 text-primary" />提现记录</h1>
          <p className="text-sm text-muted-foreground mt-0.5">历史提现申请与状态</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['申请时间', '提现金额', '消耗积分', '收款信息', '状态', '处理时间'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">加载中…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">暂无提现记录</td></tr>
                ) : rows.map(r => {
                  const s = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
                  const acct = r.account_info as { type?: string; account?: string; name?: string } ?? {};
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">¥{r.amount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.credits_amount} 积分</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {ACCT_TYPE[acct.type ?? ''] ?? acct.type} · {acct.account ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
                          {r.status === 'rejected' && r.reject_reason && (
                            <p className="text-xs text-destructive">{r.reject_reason}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString('zh-CN') : '—'}
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
