import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { BarChart3, RefreshCw, CheckCircle2, XCircle, DollarSign, Edit } from 'lucide-react';

interface AgentConfig {
  id: string;
  level: string;
  name: string;
  fee: number;
  rebate_pct: number;
  upgrade_condition: string;
  min_referrals: number;
  min_sales: number;
  description: string;
}

interface WithdrawalRow {
  id: string;
  agent_id: string;
  amount: number;
  status: string;
  account_info: Record<string, string>;
  created_at: string;
  profiles?: { username: string } | null;
}

const W_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: '待处理', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved:  { label: '已通过', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  rejected:  { label: '已驳回', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  paid:      { label: '已打款', cls: 'bg-primary/10 text-primary border-primary/20' },
};

export default function AdminAgentSettingsPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [settleDay, setSettleDay] = useState('7');
  const [minWithdraw, setMinWithdraw] = useState('100');
  const [savingSettings, setSavingSettings] = useState(false);
  const [editTarget, setEditTarget] = useState<AgentConfig | null>(null);
  const [editForm, setEditForm] = useState({ rebate_pct: '', fee: '' });

  const fetchAll = async () => {
    const [{ data: cfgs }, { data: wds }] = await Promise.all([
      supabase.from('agent_configs').select('*').order('fee'),
      supabase
        .from('withdrawals')
        .select('id, agent_id, amount, status, account_info, created_at, profiles!agent_id(username)')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    setConfigs((cfgs ?? []) as AgentConfig[]);
    setWithdrawals((wds ?? []) as unknown as WithdrawalRow[]);

    const { data: sc } = await supabase.from('system_configs').select('key, value').in('key', ['rebate_settle_days', 'min_withdrawal']);
    (sc ?? []).forEach(r => {
      if (r.key === 'rebate_settle_days') setSettleDay(r.value);
      if (r.key === 'min_withdrawal') setMinWithdraw(r.value);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const saveSettings = async () => {
    setSavingSettings(true);
    const updates = [
      supabase.from('system_configs').upsert({ key: 'rebate_settle_days', value: settleDay, description: '返点结算周期（天）' }, { onConflict: 'key' }),
      supabase.from('system_configs').upsert({ key: 'min_withdrawal', value: minWithdraw, description: '最低提现金额（元）' }, { onConflict: 'key' }),
    ];
    const results = await Promise.all(updates);
    setSavingSettings(false);
    if (results.some(r => r.error)) { toast.error('保存失败'); return; }
    toast.success('设置已保存');
  };

  const saveAgentConfig = async () => {
    if (!editTarget) return;
    const { error } = await supabase.from('agent_configs').update({
      rebate_pct: Number(editForm.rebate_pct),
      fee: Number(editForm.fee),
    }).eq('id', editTarget.id);
    if (error) { toast.error('保存失败'); return; }
    toast.success('代理配置已更新');
    setEditTarget(null);
    fetchAll();
  };

  const updateWithdrawal = async (id: string, status: string) => {
    const { error } = await supabase.from('withdrawals').update({ status }).eq('id', id);
    if (error) { toast.error('操作失败'); return; }
    toast.success(status === 'paid' ? '已标记打款' : '已驳回申请');
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> 代理管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">代理结算规则与提现审核</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      {/* 结算规则 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">全局结算规则</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">返点结算周期（T+N 天）</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={settleDay}
                onChange={e => setSettleDay(e.target.value)}
                placeholder="如：7"
              />
              <p className="text-xs text-muted-foreground">设置 T+{settleDay} 结算，即充值后第 {settleDay} 天触发返点</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">最低提现金额（元）</Label>
              <Input
                type="number"
                min={1}
                value={minWithdraw}
                onChange={e => setMinWithdraw(e.target.value)}
                placeholder="如：100"
              />
              <p className="text-xs text-muted-foreground">低于此金额不允许提现申请</p>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={savingSettings} className="gradient-primary-bg border-0 text-white hover:opacity-90">
            {savingSettings ? '保存中...' : '保存设置'}
          </Button>
        </CardContent>
      </Card>

      {/* 代理等级配置 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">代理等级配置</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {configs.map(cfg => (
            <div key={cfg.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cfg.name}</span>
                  <Badge variant="outline" className="text-xs">{cfg.level}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{cfg.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>入门费：<strong className="text-primary">¥{cfg.fee}</strong></span>
                  <span>返点比：<strong className="text-primary">{cfg.rebate_pct}%</strong></span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => { setEditTarget(cfg); setEditForm({ rebate_pct: String(cfg.rebate_pct), fee: String(cfg.fee) }); }}
              >
                <Edit className="w-3.5 h-3.5" /> 编辑
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 提现审核 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> 提现申请审核
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['代理', '金额', '收款账号', '状态', '申请时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">暂无提现申请</td></tr>
                ) : withdrawals.map(w => {
                  const s = W_STATUS[w.status] ?? W_STATUS.pending;
                  const accountInfo = w.account_info as Record<string, string>;
                  return (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(w.profiles as { username?: string } | null)?.username ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">¥{w.amount}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {accountInfo?.type ?? ''} · {accountInfo?.account ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(w.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {w.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => updateWithdrawal(w.id, 'paid')}>
                              <CheckCircle2 className="w-3 h-3" /> 打款
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateWithdrawal(w.id, 'rejected')}>
                              <XCircle className="w-3 h-3" /> 驳回
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 编辑代理配置弹窗 */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑代理配置 · {editTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">入门费（元）</Label>
              <Input type="number" value={editForm.fee} onChange={e => setEditForm(f => ({ ...f, fee: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">返点比例（%）</Label>
              <Input type="number" min={1} max={50} value={editForm.rebate_pct} onChange={e => setEditForm(f => ({ ...f, rebate_pct: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" onClick={saveAgentConfig}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
