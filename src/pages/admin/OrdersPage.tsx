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
import { ShoppingBag, Search, RefreshCw, DollarSign, TrendingUp, Clock } from 'lucide-react';

interface OrderRow {
  id: string;
  user_id: string;
  order_no: string;
  package_id: string | null;
  amount: number;
  credits: number;
  status: string;
  order_type: string;
  pay_method: string | null;
  created_at: string;
  profiles?: { username: string } | null;
  credit_packages?: { name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:          { label: '待支付',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  paid:             { label: '已支付',   cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  completed:        { label: '已完成',   cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  cancelled:        { label: '已取消',   cls: 'bg-muted text-muted-foreground border-border' },
  refunded:         { label: '已退款',   cls: 'bg-muted text-muted-foreground border-border' },
  partial_refunded: { label: '部分退款', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState({ totalRevenue: 0, todayRevenue: 0, pendingCount: 0 });
  // 退款弹窗
  const [refundTarget, setRefundTarget] = useState<OrderRow | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const PAGE_SIZE = 20;

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select(
        'id, user_id, order_no, package_id, amount, credits, status, order_type, pay_method, created_at, profiles!user_id(username), credit_packages!package_id(name)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, count } = await query;
    setOrders((data ?? []) as unknown as OrderRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  const fetchStats = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: paid } = await supabase.from('orders').select('amount').eq('status', 'paid');
    const { data: todayPaid } = await supabase.from('orders').select('amount').eq('status', 'paid').gte('created_at', today);
    const { count: pending } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    setStats({
      totalRevenue: (paid ?? []).reduce((s, o) => s + (o.amount ?? 0), 0),
      todayRevenue: (todayPaid ?? []).reduce((s, o) => s + (o.amount ?? 0), 0),
      pendingCount: pending ?? 0,
    });
  };

  useEffect(() => { fetchOrders(); fetchStats(); }, [page, statusFilter]);

  const openRefundDialog = (order: OrderRow) => {
    setRefundTarget(order);
    setRefundAmount(String(order.amount));
    setRefundReason('');
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > refundTarget.amount) {
      toast.error('退款金额无效');
      return;
    }
    setRefunding(true);
    const { error } = await supabase.functions.invoke('execute_refund_directly', {
      body: { order_no: refundTarget.order_no, refund_amount: amount, reason: refundReason || '管理员退款' },
    });
    if (error) {
      const msg = await error?.context?.text();
      toast.error(msg || '退款失败，请重试');
    } else {
      toast.success(`退款 ¥${amount} 已提交`);
      setRefundTarget(null);
      fetchOrders();
      fetchStats();
    }
    setRefunding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" /> 订单财务
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {total} 条订单</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchOrders(); fetchStats(); }} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: '累计收入', value: `¥${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
          { label: '今日收入', value: `¥${stats.todayRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-primary' },
          { label: '待支付订单', value: String(stats.pendingCount), icon: Clock, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="搜索订单号..." value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待支付</SelectItem>
              <SelectItem value="paid">已支付</SelectItem>
              <SelectItem value="partial_refunded">部分退款</SelectItem>
              <SelectItem value="refunded">已退款</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 表格 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">订单列表</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['订单号', '用户', '类型', '金额', '状态', '支付方式', '时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">加载中...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">暂无订单数据</td></tr>
                ) : orders
                    .filter(o => !keyword || o.order_no?.toLowerCase().includes(keyword.toLowerCase()))
                    .map(o => {
                  const statusInfo = STATUS_MAP[o.status] ?? STATUS_MAP.pending;
                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{o.order_no}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(o.profiles as { username?: string } | null)?.username ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {o.order_type === 'agent_fee' ? '代理费' : '积分充值'}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">¥{(o.amount ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs border ${statusInfo.cls}`}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{o.pay_method ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {o.status === 'paid' && (
                          <Button
                            variant="outline" size="sm"
                            className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => openRefundDialog(o)}
                          >
                            退款
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">第 {page + 1} 页，共 {Math.ceil(total / PAGE_SIZE)} 页</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 退款弹窗 */}
      <Dialog open={!!refundTarget} onOpenChange={open => { if (!open) setRefundTarget(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>发起退款</DialogTitle>
          </DialogHeader>
          {refundTarget && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/30 border border-border/50 divide-y divide-border/50 text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">订单号</span>
                  <span className="font-mono text-xs">{refundTarget.order_no}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">订单金额</span>
                  <span className="font-bold">¥{refundTarget.amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">退款金额 <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min="0.01" step="0.01" max={refundTarget.amount}
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">最多可退 ¥{refundTarget.amount.toFixed(2)}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">退款原因</Label>
                <Input
                  placeholder="可选，留空默认为「管理员退款」"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>取消</Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleRefund}
              disabled={refunding}
            >
              {refunding ? '退款中...' : '确认退款'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

