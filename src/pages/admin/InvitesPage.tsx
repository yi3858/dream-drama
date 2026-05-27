import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, ShieldAlert, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

export default function AdminInvitesPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [deductDialog, setDeductDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [deductReason, setDeductReason] = useState('');
  const [deducting, setDeducting] = useState(false);

  const [allDataForChart, setAllDataForChart] = useState<any[]>([]);

  useEffect(() => {
    loadRecords();
    loadChartData();
  }, [search]);

  const loadChartData = async () => {
    // 获取过去30天的记录进行图表统计
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data } = await supabase
      .from('invite_records')
      .select('created_at, inviter_reward, invitee_reward, status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });
      
    if (data) {
      setAllDataForChart(data);
    }
  };

  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string; signups: number; points: number }> = {};
    
    // 初始化过去30天的数据为0
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dailyData[dateStr] = { date: dateStr, signups: 0, points: 0 };
    }

    allDataForChart.forEach(record => {
      const dateStr = new Date(record.created_at).toISOString().slice(0, 10);
      if (dailyData[dateStr]) {
        dailyData[dateStr].signups += 1;
        // 只有发放成功的才计入积分
        if (record.status === 'rewarded' || record.status === 'completed') {
          dailyData[dateStr].points += (Number(record.inviter_reward) || 0) + (Number(record.invitee_reward) || 0);
        }
      }
    });

    return Object.values(dailyData);
  }, [allDataForChart]);

  const loadRecords = async () => {
    setLoading(true);
    let query = supabase
      .from('invite_records')
      .select(`
        *,
        inviter:profiles!invite_records_inviter_id_fkey(username, phone),
        invitee:profiles!invite_records_invitee_id_fkey(username, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data } = await query;
    
    // 如果有搜索词，在客户端过滤 (更复杂的需要RPC)
    let filtered = data || [];
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.inviter?.username?.toLowerCase().includes(lowerSearch) ||
        r.inviter?.phone?.includes(lowerSearch) ||
        r.invitee?.username?.toLowerCase().includes(lowerSearch) ||
        r.invitee?.phone?.includes(lowerSearch)
      );
    }
    
    setRecords(filtered);
    setLoading(false);
  };

  const handleDeduct = async () => {
    if (!user || !selectedRecord || !deductReason) return;
    setDeducting(true);
    
    try {
      // 1. 标记邀请记录为撤销
      await supabase
        .from('invite_records')
        .update({ status: 'revoked', remark: deductReason })
        .eq('id', selectedRecord.id);

      // 2. 调用扣除积分RPC
      // 扣除邀请人
      await supabase.rpc('consume_points', {
        p_user_id: selectedRecord.inviter_id,
        p_amount: selectedRecord.inviter_reward,
        p_reason: `管理员操作: 违规邀请撤销 - ${deductReason}`,
        p_related_id: selectedRecord.id
      });
      
      // 扣除被邀请人
      await supabase.rpc('consume_points', {
        p_user_id: selectedRecord.invitee_id,
        p_amount: selectedRecord.invitee_reward,
        p_reason: `管理员操作: 违规邀请撤销 - ${deductReason}`,
        p_related_id: selectedRecord.id
      });

      // 3. 记录日志
      await supabase.from('admin_operation_logs').insert({
        admin_id: user.id,
        action_type: 'revoke_invite',
        target_id: selectedRecord.id,
        details: { reason: deductReason, record: selectedRecord }
      });

      toast.success('已撤销奖励并扣除相应积分');
      setDeductDialog(false);
      loadRecords();
    } catch (err) {
      console.error(err);
      toast.error('操作失败');
    } finally {
      setDeducting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            推广数据大盘与明细
          </h2>
          <p className="text-muted-foreground mt-2">
            监控平台邀请活动趋势，防范羊毛党作弊
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索用户名或手机号..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">每日邀请注册量趋势</CardTitle>
            <CardDescription>过去30天通过邀请码注册的新用户数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.substring(5)} 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="signups" name="邀请注册量" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSignups)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">每日积分发放趋势</CardTitle>
            <CardDescription>过去30天发放的推广奖励积分总额</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val.substring(5)} 
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="points" name="发放积分" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPoints)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto">
            <Table className="[&>div]:max-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap pl-6">邀请时间</TableHead>
                  <TableHead className="whitespace-nowrap">邀请人</TableHead>
                  <TableHead className="whitespace-nowrap">被邀请人</TableHead>
                  <TableHead className="whitespace-nowrap">发放奖励</TableHead>
                  <TableHead className="whitespace-nowrap">状态</TableHead>
                  <TableHead className="whitespace-nowrap text-right pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {loading ? '加载中...' : '暂无数据'}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap pl-6 text-sm text-muted-foreground">
                        {new Date(record.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{record.inviter?.username}</div>
                        <div className="text-xs text-muted-foreground">{record.inviter?.phone || '无手机号'}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{record.invitee?.username}</div>
                        <div className="text-xs text-muted-foreground">{record.invitee?.phone || '无手机号'}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <span className="text-emerald-500">+{record.inviter_reward} (邀)</span> <br/>
                        <span className="text-emerald-500">+{record.invitee_reward} (受)</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.status === 'completed' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">已发放</Badge>
                        ) : (
                          <div>
                            <Badge variant="outline" className="bg-destructive/10 text-destructive mb-1">已撤销</Badge>
                            {record.remark && <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={record.remark}>{record.remark}</div>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right pr-6">
                        {record.status === 'completed' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedRecord(record);
                              setDeductReason('');
                              setDeductDialog(true);
                            }}
                          >
                            <ShieldAlert className="w-4 h-4 mr-1" /> 判违规扣除
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deductDialog} onOpenChange={setDeductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>违规处罚确认</DialogTitle>
            <DialogDescription>
              此操作将撤销该笔邀请记录，并从邀请人和被邀请人账户中分别扣除 {selectedRecord?.inviter_reward} 和 {selectedRecord?.invitee_reward} 积分。如果用户账户余额不足，将扣至负数。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>处罚原因备注 (必填)</Label>
              <Input 
                value={deductReason} 
                onChange={e => setDeductReason(e.target.value)} 
                placeholder="例如：同IP批量注册刷积分"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDeduct} disabled={deducting || !deductReason.trim()}>
              {deducting ? '处理中...' : '确认扣除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}