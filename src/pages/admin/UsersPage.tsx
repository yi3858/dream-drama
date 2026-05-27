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
import { Users, Search, Shield, Ban, RefreshCw, Zap, Plus, Minus } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  agent_level: string | null;
  credits: number;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  user: '普通用户',
  agent2: '二级代理',
  agent1: '一级代理',
  admin: '管理员',
};
const ROLE_COLORS: Record<string, string> = {
  user: 'bg-muted text-muted-foreground',
  agent2: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  agent1: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
};

// ─── 手动调整积分弹窗 ──────────────────────────────────────────────
interface AdjustCreditsDialogProps {
  user: UserRow | null;
  onClose: () => void;
  onDone: () => void;
}

function AdjustCreditsDialog({ user, onClose, onDone }: AdjustCreditsDialogProps) {
  const [delta, setDelta] = useState('');
  const [remark, setRemark] = useState('');
  const [mode, setMode] = useState<'add' | 'sub'>('add');
  const [saving, setSaving] = useState(false);

  // 重置表单当弹窗打开新用户时
  useEffect(() => {
    if (user) { setDelta(''); setRemark(''); setMode('add'); }
  }, [user]);

  const handleConfirm = async () => {
    if (!user) return;
    const num = parseInt(delta, 10);
    if (isNaN(num) || num <= 0) { toast.error('请输入有效的积分数值（正整数）'); return; }
    if (!remark.trim()) { toast.error('请填写操作备注'); return; }

    const actualDelta = mode === 'add' ? num : -num;
    const newCredits = Math.max(0, (user.credits ?? 0) + actualDelta);

    setSaving(true);
    try {
      // 更新 profiles 积分
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id);
      if (updateErr) throw updateErr;

      // 写入积分流水
      const { error: logErr } = await supabase.from('credit_logs').insert({
        user_id: user.id,
        amount: actualDelta,
        balance_after: newCredits,
        type: mode === 'add' ? 'admin_add' : 'admin_sub',
        remark: remark.trim(),
      });
      if (logErr) throw logErr;

      // 发送站内通知 + 短信
      const { error: notifErr } = await supabase.functions.invoke('notify-credit-adjusted', {
        body: {
          userId: user.id,
          phone: user.phone ?? '',
          delta: num,
          balanceAfter: newCredits,
          remark: remark.trim(),
          mode,
        },
      });
      if (notifErr) {
        const msg = await notifErr?.context?.text?.();
        console.warn('通知发送失败:', msg || notifErr.message);
      }

      toast.success(`已${mode === 'add' ? '增加' : '扣减'} ${num} 积分，当前余额 ${newCredits.toLocaleString()}`);
      onDone();
    } catch (e: unknown) {
      toast.error('操作失败', { description: e instanceof Error ? e.message : '请重试' });
    } finally {
      setSaving(false);
    }
  };

  const currentCredits = user?.credits ?? 0;
  const previewNum = parseInt(delta, 10);
  const previewCredits = !isNaN(previewNum) && previewNum > 0
    ? Math.max(0, currentCredits + (mode === 'add' ? previewNum : -previewNum))
    : null;

  return (
    <Dialog open={!!user} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            手动调整积分
          </DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4 py-1">
            {/* 用户信息 */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">用户名</span>
                <span className="font-medium">{user.username || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">手机号</span>
                <span className="font-medium font-mono">{user.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">当前积分</span>
                <span className="font-bold text-primary">{currentCredits.toLocaleString()}</span>
              </div>
            </div>

            {/* 增加/扣减切换 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">操作类型</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('add')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                    mode === 'add' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground'
                  }`}
                >
                  <Plus className="w-4 h-4" /> 增加积分
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sub')}
                  className={`flex items-center justify-center gap-2 h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                    mode === 'sub' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border text-muted-foreground'
                  }`}
                >
                  <Minus className="w-4 h-4" /> 扣减积分
                </button>
              </div>
            </div>

            {/* 积分数值 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">
                {mode === 'add' ? '增加积分数量' : '扣减积分数量'} *
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="请输入正整数，如：100"
                className="h-10"
                value={delta}
                onChange={e => setDelta(e.target.value)}
              />
              {previewCredits !== null && (
                <p className="text-xs text-muted-foreground">
                  操作后余额：
                  <span className={`font-semibold ml-1 ${mode === 'add' ? 'text-emerald-500' : 'text-destructive'}`}>
                    {previewCredits.toLocaleString()} 积分
                  </span>
                </p>
              )}
            </div>

            {/* 操作备注 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">操作备注 *</Label>
              <Input
                placeholder="如：微信充值99元 / 退款扣减"
                className="h-10"
                value={remark}
                onChange={e => setRemark(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>取消</Button>
          <Button
            className={`border-0 text-white hover:opacity-90 ${mode === 'add' ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-destructive hover:bg-destructive'}`}
            disabled={saving}
            onClick={handleConfirm}
          >
            {saving ? '处理中...' : `确认${mode === 'add' ? '增加' : '扣减'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 页面主体 ─────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [adjustTarget, setAdjustTarget] = useState<UserRow | null>(null);
  const PAGE_SIZE = 20;

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, username, email, phone, role, agent_level, credits, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (roleFilter !== 'all') query = query.eq('role', roleFilter);
    if (keyword.trim()) query = query.ilike('username', `%${keyword.trim()}%`);

    const { data, count } = await query;
    setUsers((data ?? []) as UserRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const handleSearch = () => { setPage(0); fetchUsers(); };

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { toast.error('操作失败'); return; }
    toast.success('角色已更新');
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> 用户管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {total} 位用户</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索用户名..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="角色筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部角色</SelectItem>
              <SelectItem value="user">普通用户</SelectItem>
              <SelectItem value="agent2">二级代理</SelectItem>
              <SelectItem value="agent1">一级代理</SelectItem>
              <SelectItem value="admin">管理员</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} className="gap-1.5 shrink-0">
            <Search className="w-4 h-4" /> 搜索
          </Button>
        </CardContent>
      </Card>

      {/* 表格 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">用户列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['用户名', '手机号', '邮箱', '角色', '当前积分', '注册时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">加载中...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">暂无用户数据</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{u.username || '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground whitespace-nowrap">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap max-w-[140px] truncate">{u.email || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={`text-xs border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.user}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono font-semibold text-primary">{(u.credits ?? 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {/* 手动调整积分 */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => setAdjustTarget(u)}
                        >
                          <Zap className="w-3 h-3" /> 调整积分
                        </Button>
                        {u.role !== 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => changeRole(u.id, u.role === 'user' ? 'agent2' : 'user')}
                          >
                            <Shield className="w-3 h-3" />
                            {u.role === 'user' ? '设为代理' : '降为用户'}
                          </Button>
                        )}
                        {u.role === 'agent2' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-violet-400 border-violet-500/30 hover:bg-violet-500/10"
                            onClick={() => changeRole(u.id, 'agent1')}
                          >
                            升为一级
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              第 {page + 1} 页，共 {Math.ceil(total / PAGE_SIZE)} 页
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '总用户', key: 'all', icon: Users },
          { label: '二级代理', key: 'agent2', icon: Shield },
          { label: '一级代理', key: 'agent1', icon: Shield },
          { label: '今日封禁', key: 'banned', icon: Ban },
        ].map(({ label, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">—</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 手动调整积分弹窗 */}
      <AdjustCreditsDialog
        user={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onDone={() => { setAdjustTarget(null); fetchUsers(); }}
      />
    </div>
  );
}
