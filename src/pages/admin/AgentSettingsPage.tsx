import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  BarChart3, RefreshCw, CheckCircle2, XCircle, DollarSign, Edit,
  Users, ClipboardList, Settings, ArrowDownToLine, Activity, Shield
} from 'lucide-react';

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

interface AgentRow {
  id: string;
  username: string | null;
  email: string | null;
  agent_level: string;
  rebate_credits_frozen: number;
  rebate_credits_available: number;
  created_at: string;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  level: string;
  fee: number;
  contact_info: string;
  reason: string;
  status: string;
  reject_reason: string | null;
  created_at: string;
  profiles?: { username: string | null; email: string | null } | null;
}

interface WithdrawalRow {
  id: string;
  agent_id: string;
  amount: number;
  credits_amount: number;
  status: string;
  account_info: Record<string, string>;
  reject_reason: string | null;
  created_at: string;
  profiles?: { username: string | null } | null;
}

interface RebateRow {
  id: string;
  agent_id: string;
  order_amount: number;
  rebate_pct: number;
  rebate_amount: number;
  credits_amount: number;
  consumed_credits: number;
  source_type: string;
  status: string;
  freeze_until: string | null;
  created_at: string;
  agent?: { username: string | null } | null;
  from_user?: { username: string | null } | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: '待处理', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved:  { label: '已通过', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  rejected:  { label: '已驳回', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  paid:      { label: '已打款', cls: 'bg-primary/10 text-primary border-primary/20' },
  frozen:    { label: '冻结中', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  available: { label: '可提现', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  withdrawn: { label: '已提现', cls: 'bg-muted/50 text-muted-foreground border-border' },
  consumed:  { label: '已消费', cls: 'bg-muted/50 text-muted-foreground border-border' },
};

const LEVEL_NAMES: Record<string, string> = { agent1: '一级代理', agent2: '二级代理' };

// ─── 代理列表 ───────────────────────────────────────────────
function TabAgentList({ onRefresh }: { onRefresh: () => void }) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, agent_level, rebate_credits_frozen, rebate_credits_available, created_at')
      .in('agent_level', ['agent1', 'agent2'])
      .order('created_at', { ascending: false });
    setAgents((data ?? []) as AgentRow[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" />代理列表</CardTitle>
        <Button variant="outline" size="sm" onClick={fetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                {['账号', '等级', '冻结积分', '可提现积分', '加入时间'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">加载中…</td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">暂无代理</td></tr>
              ) : agents.map(a => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{a.username ?? a.email ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="outline" className={a.agent_level === 'agent1' ? 'text-amber-400 border-amber-500/30' : 'text-primary border-primary/30'}>
                      {LEVEL_NAMES[a.agent_level] ?? a.agent_level}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-amber-400 font-medium">{a.rebate_credits_frozen}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-green-400 font-medium">{a.rebate_credits_available}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 代理审核 ───────────────────────────────────────────────
function TabApplications() {
  const [rows, setRows]             = useState<ApplicationRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agent_applications')
      .select('*, profiles!user_id(username, email)')
      .order('created_at', { ascending: false })
      .limit(50);
    setRows((data ?? []) as unknown as ApplicationRow[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const approve = async (app: ApplicationRow) => {
    const { error: e1 } = await supabase
      .from('agent_applications')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', app.id);
    if (e1) { toast.error('操作失败'); return; }
    // 升级代理等级
    const { error: e2 } = await supabase
      .from('profiles')
      .update({ agent_level: app.level, role: app.level })
      .eq('id', app.user_id);
    if (e2) { toast.error('升级代理等级失败'); return; }
    toast.success('审核通过，代理权限已开通');
    fetch();
  };

  const reject = async () => {
    if (!rejectTarget) return;
    await supabase.from('agent_applications')
      .update({ status: 'rejected', reject_reason: rejectReason, reviewed_at: new Date().toISOString() })
      .eq('id', rejectTarget);
    toast.success('已驳回申请');
    setRejectTarget(null);
    setRejectReason('');
    fetch();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" />代理申请审核</CardTitle>
          <Button variant="outline" size="sm" onClick={fetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['申请人', '等级', '入门费', '联系方式', '状态', '申请时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">加载中…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">暂无申请</td></tr>
                ) : rows.map(r => {
                  const s = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
                  const prof = r.profiles as { username?: string | null; email?: string | null } | null;
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{prof?.username ?? prof?.email ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={r.level === 'agent1' ? 'text-amber-400 border-amber-500/30' : 'text-primary border-primary/30'}>
                          {LEVEL_NAMES[r.level] ?? r.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">¥{r.fee}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs max-w-[120px] truncate">{r.contact_info}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => approve(r)}>
                              <CheckCircle2 className="w-3 h-3" />通过
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRejectTarget(r.id)}>
                              <XCircle className="w-3 h-3" />驳回
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

      <Dialog open={!!rejectTarget} onOpenChange={o => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>驳回代理申请</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-normal">驳回原因</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请填写驳回原因（将通知申请人）" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={reject}>确认驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 提现审核 ───────────────────────────────────────────────
function TabWithdrawals() {
  const [rows, setRows]           = useState<WithdrawalRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('withdrawals')
      .select('*, profiles!agent_id(username)')
      .order('created_at', { ascending: false })
      .limit(50);
    setRows((data ?? []) as unknown as WithdrawalRow[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const markPaid = async (id: string, agentId: string, credits: number) => {
    const { error } = await supabase.from('withdrawals')
      .update({ status: 'paid', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('操作失败'); return; }
    // 扣除可提现积分
    await supabase.rpc('fn_deduct_available_rebate' as never, { p_user_id: agentId, p_credits: credits });
    toast.success('已标记打款');
    fetch();
  };

  const reject = async () => {
    if (!rejectTarget) return;
    await supabase.from('withdrawals')
      .update({ status: 'rejected', reject_reason: rejectReason, reviewed_at: new Date().toISOString() })
      .eq('id', rejectTarget);
    toast.success('已驳回提现申请');
    setRejectTarget(null);
    setRejectReason('');
    fetch();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ArrowDownToLine className="w-4 h-4 text-primary" />提现申请审核</CardTitle>
          <Button variant="outline" size="sm" onClick={fetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['代理', '提现金额', '消耗积分', '收款账号', '状态', '申请时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">加载中…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">暂无提现申请</td></tr>
                ) : rows.map(w => {
                  const s = STATUS_MAP[w.status] ?? STATUS_MAP.pending;
                  const prof = w.profiles as { username?: string | null } | null;
                  const acct = w.account_info as Record<string, string>;
                  return (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{prof?.username ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">¥{w.amount}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{w.credits_amount} 积分</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {acct?.type ?? ''} · {acct?.account ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(w.created_at).toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {w.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => markPaid(w.id, w.agent_id, w.credits_amount)}>
                              <CheckCircle2 className="w-3 h-3" />打款
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRejectTarget(w.id)}>
                              <XCircle className="w-3 h-3" />驳回
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

      <Dialog open={!!rejectTarget} onOpenChange={o => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>驳回提现申请</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-sm font-normal">驳回原因</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请填写驳回原因" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={reject}>确认驳回</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 返佣配置 ───────────────────────────────────────────────
function TabRebateConfig() {
  const [configs, setConfigs]     = useState<AgentConfig[]>([]);
  const [freezeDays, setFreezeDays] = useState('15');
  const [editTarget, setEditTarget] = useState<AgentConfig | null>(null);
  const [editForm, setEditForm]   = useState({ rebate_pct: '', fee: '' });
  const [saving, setSaving]       = useState(false);

  const fetch = async () => {
    const [{ data: cfgs }, { data: sc }] = await Promise.all([
      supabase.from('agent_configs').select('*').order('fee'),
      supabase.from('system_configs').select('key,value').in('key', ['rebate_settle_days', 'rebate_freeze_days']),
    ]);
    setConfigs((cfgs ?? []) as AgentConfig[]);
    (sc ?? []).forEach(r => {
      if (r.key === 'rebate_settle_days' || r.key === 'rebate_freeze_days') setFreezeDays(r.value);
    });
  };

  useEffect(() => { fetch(); }, []);

  const saveFreezeDays = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from('system_configs').upsert({ key: 'rebate_settle_days', value: freezeDays, description: '返佣积分冻结天数（T+N）' }, { onConflict: 'key' }),
      supabase.from('system_configs').upsert({ key: 'rebate_freeze_days',  value: freezeDays, description: '返佣积分冻结天数（T+N）' }, { onConflict: 'key' }),
    ]);
    setSaving(false);
    toast.success('冻结天数已保存');
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
    fetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />返佣配置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">积分冻结天数（T+N 天解冻）</Label>
            <div className="flex gap-2 max-w-xs">
              <Input type="number" min={1} max={90} value={freezeDays} onChange={e => setFreezeDays(e.target.value)} placeholder="15" />
              <Button onClick={saveFreezeDays} disabled={saving} className="shrink-0 gradient-primary-bg border-0 text-white hover:opacity-90">
                {saving ? '保存中…' : '保存'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">当前配置：T+{freezeDays} 天后冻结积分转为可提现</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">代理等级返点配置</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {configs.map(cfg => (
            <div key={cfg.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{cfg.name}</span>
                  <Badge variant="outline" className="text-xs">{cfg.level === 'agent1' ? '一级代理' : '二级代理'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{cfg.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>入门费：<strong className="text-primary">¥{cfg.fee}</strong></span>
                  <span>返点比：<strong className="text-primary">{cfg.rebate_pct}%</strong></span>
                  <span className="text-muted-foreground text-xs">充值100元返{Number(cfg.rebate_pct) * 10}积分</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0"
                onClick={() => { setEditTarget(cfg); setEditForm({ rebate_pct: String(cfg.rebate_pct), fee: String(cfg.fee) }); }}>
                <Edit className="w-3.5 h-3.5" />编辑
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>编辑代理配置 · {editTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">入门费（元）</Label>
              <Input type="number" value={editForm.fee} onChange={e => setEditForm(f => ({ ...f, fee: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">返点比例（%）</Label>
              <Input type="number" min={1} max={50} value={editForm.rebate_pct} onChange={e => setEditForm(f => ({ ...f, rebate_pct: e.target.value }))} />
              <p className="text-xs text-muted-foreground">充值100元将返 {Number(editForm.rebate_pct || 0) * 10} 积分</p>
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

// ─── 全局结算配置 ─────────────────────────────────────────
function TabSettlement() {
  const [minWithdraw, setMinWithdraw]       = useState('500');
  const [exchangeRate, setExchangeRate]     = useState('10');
  const [minCredits, setMinCredits]         = useState('5000');
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    supabase.from('system_configs').select('key,value')
      .in('key', ['min_withdrawal', 'credits_exchange_rate', 'min_withdraw_credits'])
      .then(({ data }) => {
        (data ?? []).forEach(r => {
          if (r.key === 'min_withdrawal')       setMinWithdraw(r.value);
          if (r.key === 'credits_exchange_rate') setExchangeRate(r.value);
          if (r.key === 'min_withdraw_credits')  setMinCredits(r.value);
        });
      });
  }, []);

  const save = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from('system_configs').upsert({ key: 'min_withdrawal',        value: minWithdraw,   description: '最低提现金额（元）' },          { onConflict: 'key' }),
      supabase.from('system_configs').upsert({ key: 'credits_exchange_rate', value: exchangeRate,  description: '积分兑换汇率：N积分=1元' },       { onConflict: 'key' }),
      supabase.from('system_configs').upsert({ key: 'min_withdraw_credits',  value: minCredits,    description: '最低提现积分数量' },              { onConflict: 'key' }),
    ]);
    setSaving(false);
    toast.success('结算配置已保存');
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" />全局结算配置</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">积分兑换汇率（N积分 = 1元）</Label>
            <Input type="number" min={1} value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
            <p className="text-xs text-muted-foreground">当前：{exchangeRate}积分 = 1元</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">最低提现金额（元）</Label>
            <Input type="number" min={1} value={minWithdraw} onChange={e => setMinWithdraw(e.target.value)} />
            <p className="text-xs text-muted-foreground">低于此金额不允许提现</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">最低提现积分数</Label>
            <Input type="number" min={1} value={minCredits} onChange={e => setMinCredits(e.target.value)} />
            <p className="text-xs text-muted-foreground">= 最低提现金额 × 汇率</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm text-muted-foreground">
          当前规则：账户内需有 <strong className="text-foreground">{minCredits}</strong> 积分处于「可提现」状态，方可申请提现 <strong className="text-foreground">¥{minWithdraw}</strong>
        </div>
        <Button onClick={save} disabled={saving} className="gradient-primary-bg border-0 text-white hover:opacity-90">
          {saving ? '保存中…' : '保存配置'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── 积分流水 ─────────────────────────────────────────────
function TabRebateLogs() {
  const [rows, setRows]     = useState<RebateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetch = async () => {
    setLoading(true);
    let q = supabase
      .from('rebate_logs')
      .select('*, agent:agent_id(username), from_user:from_user_id(username)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    const { data } = await q;
    setRows((data ?? []) as unknown as RebateRow[]);
    setLoading(false);
  };

  // 手动触发解冻（调用数据库函数）
  const runUnfreeze = async () => {
    const { data } = await supabase.rpc('fn_unfreeze_rebate_credits' as never);
    toast.success(`已解冻 ${data ?? 0} 条记录`);
    fetch();
  };

  useEffect(() => { fetch(); }, [filterStatus]);

  const SOURCE_LABELS: Record<string, string> = { promote: '推广充值', self: '自身充值' };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />积分流水</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {[['all','全部'],['frozen','冻结中'],['available','可提现'],['withdrawn','已提现'],['consumed','已消费']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-3 py-1.5 transition-colors ${filterStatus === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}>
                {l}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={runUnfreeze} className="gap-1.5 text-green-400 border-green-500/30 hover:bg-green-500/10">
            <CheckCircle2 className="w-3.5 h-3.5" />触发解冻
          </Button>
          <Button variant="outline" size="sm" onClick={fetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                {['代理账号', '来源用户', '来源类型', '充值金额', '返点%', '返佣金额', '返佣积分', '已消费', '状态', '解冻时间'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">加载中…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">暂无记录</td></tr>
              ) : rows.map(r => {
                const s = STATUS_MAP[r.status] ?? STATUS_MAP.frozen;
                const agent = r.agent as { username?: string | null } | null;
                const fromUser = r.from_user as { username?: string | null } | null;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{agent?.username ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fromUser?.username ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{SOURCE_LABELS[r.source_type] ?? r.source_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap">¥{r.order_amount}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.rebate_pct}%</td>
                    <td className="px-4 py-3 whitespace-nowrap text-primary font-medium">¥{r.rebate_amount}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-primary font-medium">{r.credits_amount}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{r.consumed_credits}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {r.freeze_until ? new Date(r.freeze_until).toLocaleDateString('zh-CN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 主页面 ───────────────────────────────────────────────
export default function AdminAgentSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />代理管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">代理审核、返佣配置与提现管理</p>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="h-9 whitespace-nowrap">
            <TabsTrigger value="list"       className="gap-1.5 text-xs md:text-sm"><Users className="w-3.5 h-3.5" />代理列表</TabsTrigger>
            <TabsTrigger value="apply"      className="gap-1.5 text-xs md:text-sm"><Shield className="w-3.5 h-3.5" />代理审核</TabsTrigger>
            <TabsTrigger value="withdraw"   className="gap-1.5 text-xs md:text-sm"><ArrowDownToLine className="w-3.5 h-3.5" />提现审核</TabsTrigger>
            <TabsTrigger value="rebate"     className="gap-1.5 text-xs md:text-sm"><Settings className="w-3.5 h-3.5" />返佣配置</TabsTrigger>
            <TabsTrigger value="settlement" className="gap-1.5 text-xs md:text-sm"><DollarSign className="w-3.5 h-3.5" />结算配置</TabsTrigger>
            <TabsTrigger value="logs"       className="gap-1.5 text-xs md:text-sm"><Activity className="w-3.5 h-3.5" />积分流水</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="list">       <TabAgentList onRefresh={() => {}} /></TabsContent>
        <TabsContent value="apply">      <TabApplications /></TabsContent>
        <TabsContent value="withdraw">   <TabWithdrawals /></TabsContent>
        <TabsContent value="rebate">     <TabRebateConfig /></TabsContent>
        <TabsContent value="settlement"> <TabSettlement /></TabsContent>
        <TabsContent value="logs">       <TabRebateLogs /></TabsContent>
      </Tabs>
    </div>
  );
}
