import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Users, Search, Shield, Ban, RefreshCw } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  email: string;
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, username, email, role, agent_level, credits, created_at', { count: 'exact' })
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
                  {['用户名', '邮箱', '角色', '积分余额', '注册时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">加载中...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">暂无用户数据</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{u.username || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.email || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={`text-xs border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.user}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-primary">{u.credits ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
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
    </div>
  );
}
