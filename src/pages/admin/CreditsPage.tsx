import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Coins, Search, RefreshCw, Plus, Minus, User, Phone, ChevronRight } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  credits: number;
  created_at: string;
}

// ─── 调整积分弹窗 ─────────────────────────────────────────────────
interface AdjustDialogProps {
  user: UserRow | null;
  onClose: () => void;
  onDone: () => void;
}

function AdjustCreditsDialog({ user, onClose, onDone }: AdjustDialogProps) {
  const [delta, setDelta] = useState('');
  const [remark, setRemark] = useState('');
  const [mode, setMode] = useState<'add' | 'sub'>('add');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) { setDelta(''); setRemark(''); setMode('add'); }
  }, [user?.id]);

  const handleConfirm = async () => {
    if (!user) return;
    const num = parseInt(delta, 10);
    if (isNaN(num) || num <= 0) { toast.error('请输入有效的积分数值（正整数）'); return; }
    if (!remark.trim()) { toast.error('请填写操作备注'); return; }

    const actualDelta = mode === 'add' ? num : -num;
    const newCredits = Math.max(0, (user.credits ?? 0) + actualDelta);

    setSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from('profiles').update({ credits: newCredits }).eq('id', user.id);
      if (updateErr) throw updateErr;

      const { error: logErr } = await supabase.from('credit_logs').insert({
        user_id: user.id,
        amount: actualDelta,
        balance_after: newCredits,
        type: mode === 'add' ? 'admin_add' : 'admin_sub',
        remark: remark.trim(),
      });
      if (logErr) throw logErr;

      // 站内通知 + 短信
      const { error: notifErr } = await supabase.functions.invoke('notify-credit-adjusted', {
        body: { userId: user.id, phone: user.phone ?? '', delta: num, balanceAfter: newCredits, remark: remark.trim(), mode },
      });
      if (notifErr) {
        const msg = await notifErr?.context?.text?.();
        console.warn('通知发送失败:', msg || notifErr.message);
      }

      toast.success(`已${mode === 'add' ? '增加' : '扣减'} ${num} 积分，余额 ${newCredits.toLocaleString()}`);
      onDone();
    } catch (e: unknown) {
      toast.error('操作失败', { description: e instanceof Error ? e.message : '请重试' });
    } finally {
      setSaving(false);
    }
  };

  const previewBalance = (() => {
    const num = parseInt(delta, 10);
    if (isNaN(num) || num <= 0 || !user) return null;
    return Math.max(0, (user.credits ?? 0) + (mode === 'add' ? num : -num));
  })();

  return (
    <Dialog open={!!user} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            手动调整积分
          </DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4">
            {/* 用户信息卡 */}
            <div className="rounded-lg bg-muted/50 border border-border p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{user.username || '未设置昵称'}</p>
                <p className="text-xs text-muted-foreground">{user.phone || user.email || user.id.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">当前积分</p>
                <p className="text-lg font-bold text-primary">{(user.credits ?? 0).toLocaleString()}</p>
              </div>
            </div>

            {/* 操作模式 */}
            <div className="space-y-1.5">
              <Label>操作类型</Label>
              <Select value={mode} onValueChange={v => setMode(v as 'add' | 'sub')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <span className="flex items-center gap-2"><Plus className="w-3.5 h-3.5 text-green-500" />增加积分</span>
                  </SelectItem>
                  <SelectItem value="sub">
                    <span className="flex items-center gap-2"><Minus className="w-3.5 h-3.5 text-destructive" />扣减积分</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 积分数量 */}
            <div className="space-y-1.5">
              <Label>积分数量</Label>
              <Input
                type="number"
                min="1"
                placeholder="请输入积分数值"
                value={delta}
                onChange={e => setDelta(e.target.value)}
              />
              {previewBalance !== null && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  操作后积分余额：
                  <span className={`font-semibold ${mode === 'add' ? 'text-green-500' : 'text-destructive'}`}>
                    {previewBalance.toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            {/* 备注 */}
            <div className="space-y-1.5">
              <Label>操作备注 <span className="text-destructive">*</span></Label>
              <Input
                placeholder="如：用户已转账100元，附截图核实"
                value={remark}
                onChange={e => setRemark(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button onClick={handleConfirm} disabled={saving} className="gap-1.5">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
            确认{mode === 'add' ? '充值' : '扣减'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────
export default function AdminCreditsPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<UserRow | null>(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    setSearched(true);
    const trimmed = q.trim();
    let query = supabase
      .from('profiles')
      .select('id, username, email, phone, role, credits, created_at')
      .order('credits', { ascending: false })
      .limit(50);

    if (trimmed) {
      query = query.or(`username.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
    }

    const { data, error } = await query;
    if (error) { toast.error('查询失败', { description: error.message }); }
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  // 默认加载最近50条
  useEffect(() => { doSearch(''); }, [doSearch]);

  const handleSearch = () => doSearch(query);

  const refreshUser = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, phone, role, credits, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setUsers(prev => prev.map(u => u.id === userId ? data as UserRow : u));
    }
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" /> 用户积分管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">搜索用户账号或手机号，查看并手动调整积分</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => doSearch(query)}>
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      {/* 搜索区 */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="输入用户名、手机号或邮箱搜索..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="gap-1.5 shrink-0">
              <Search className="w-3.5 h-3.5" />
              {loading ? '搜索中...' : '搜索'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {searched ? `共 ${users.length} 条结果` : '所有用户（按积分排序）'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>
          ) : users.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
              <User className="w-10 h-10 opacity-25" />
              <p className="text-sm">暂无匹配用户</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">用户</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />手机号</span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">角色</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      <span className="flex items-center justify-end gap-1"><Coins className="w-3.5 h-3.5" />当前积分</span>
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium">{u.username || '—'}</p>
                        <p className="text-xs text-muted-foreground">{u.email || u.id.slice(0, 12) + '...'}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {u.phone || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {u.role === 'admin' ? '管理员' : u.role === 'agent1' ? '一级代理' : u.role === 'agent2' ? '二级代理' : '普通用户'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-primary text-base">{(u.credits ?? 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => setAdjustTarget(u)}
                        >
                          <Coins className="w-3 h-3" /> 调整积分
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 调整积分弹窗 */}
      <AdjustCreditsDialog
        user={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onDone={() => {
          if (adjustTarget) refreshUser(adjustTarget.id);
          setAdjustTarget(null);
        }}
      />
    </div>
  );
}
