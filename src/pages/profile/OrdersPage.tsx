import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Order } from '@/types';
import { ShoppingBag } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: '待支付', class: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  paid: { label: '已支付', class: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  completed: { label: '已完成', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  cancelled: { label: '已取消', class: 'bg-muted text-muted-foreground border-border' },
  refunded: { label: '已退款', class: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('*, credit_packages(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" /> 订单记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">暂无订单记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const st = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {order.remark ?? order.credit_packages?.name ?? '充值订单'}
                        </span>
                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 border ${st.class}`}>
                          {st.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.order_no} · {new Date(order.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold ${order.status === 'refunded' ? 'text-destructive/70 line-through' : 'text-primary'}`}>
                        ¥{order.amount.toFixed(2)}
                      </p>
                      {order.credits > 0 && (
                        <p className={`text-xs font-bold mt-0.5 ${
                          order.status === 'refunded' 
                            ? 'text-destructive' 
                            : 'text-emerald-500 dark:text-emerald-400'
                        }`}>
                          +{order.credits.toLocaleString()} 积分
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
