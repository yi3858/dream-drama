import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { Users, ShoppingBag, Shield, Settings, Layers, BarChart3, TrendingUp, DollarSign, Clock, Palette, BookUser } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingReviews: number;
  pendingWithdrawals: number;
  todayWorks: number;
}

const QUICK_LINKS = [
  { label: '用户管理', href: '/admin/users', icon: Users, desc: '查看与管理所有用户' },
  { label: '订单财务', href: '/admin/orders', icon: ShoppingBag, desc: '订单列表与退款操作' },
  { label: '内容审核', href: '/admin/review', icon: Shield, desc: '审核AI生成内容合规性' },
  { label: '代理管理', href: '/admin/agents', icon: BarChart3, desc: '结算规则与提现审核' },
  { label: '作品管理', href: '/admin/works', icon: Layers, desc: '全平台作品查看与删除' },
  { label: '画风配置', href: '/admin/styles', icon: Palette, desc: '上传各画风动态演示视频' },
  { label: '角色库管理', href: '/admin/characters', icon: BookUser, desc: '管理公开角色，下架违规内容' },
  { label: '系统配置', href: '/admin/config', icon: Settings, desc: '积分规则与全局参数' },
];

export default function AdminIndexPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalOrders: 0, totalRevenue: 0,
    pendingReviews: 0, pendingWithdrawals: 0, todayWorks: 0,
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('amount').eq('status', 'paid'),
      supabase.from('works').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
      supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('works').select('id', { count: 'exact', head: true }).gte('created_at', today),
    ]).then(([users, orders, revenue, reviews, withdrawals, todayW]) => {
      setStats({
        totalUsers: users.count ?? 0,
        totalOrders: orders.count ?? 0,
        totalRevenue: (revenue.data ?? []).reduce((s: number, o: { amount: number }) => s + (o.amount ?? 0), 0),
        pendingReviews: reviews.count ?? 0,
        pendingWithdrawals: withdrawals.count ?? 0,
        todayWorks: todayW.count ?? 0,
      });
    });
  }, []);

  const STAT_CARDS = [
    { label: '注册用户', value: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: '累计订单', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-400' },
    { label: '累计收入', value: `¥${stats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-green-400' },
    { label: '待审核内容', value: stats.pendingReviews, icon: Shield, color: 'text-amber-400' },
    { label: '待处理提现', value: stats.pendingWithdrawals, icon: TrendingUp, color: 'text-violet-400' },
    { label: '今日创作', value: stats.todayWorks, icon: Clock, color: 'text-cyan-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">管理后台概览</h1>
        <p className="text-sm text-muted-foreground mt-0.5">平台运营数据实时监控</p>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快捷入口 */}
      <div>
        <h2 className="text-base font-semibold mb-3">快捷入口</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map(({ label, href, icon: Icon, desc }) => (
            <Card key={href} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground text-pretty mt-0.5">{desc}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 h-7 text-xs">
                  <Link to={href}>进入</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
