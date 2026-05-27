import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import {
  BarChart2, Users, Sparkles, Zap, TrendingUp, Film, BookOpen, Clock
} from 'lucide-react';

const platformStats = [
  { label: '注册用户', value: '12,847', icon: Users, color: 'text-cyan-400', trend: '+8.3%' },
  { label: '总生成次数', value: '86,340', icon: Sparkles, color: 'text-violet-400', trend: '+12.1%' },
  { label: '今日生成', value: '1,248', icon: Zap, color: 'text-amber-400', trend: '+5.6%' },
  { label: '今日新增用户', value: '312', icon: TrendingUp, color: 'text-emerald-400', trend: '+3.2%' },
];

const weeklyData = [
  { day: '周一', 小说转漫剧: 180, 短剧转动漫: 95 },
  { day: '周二', 小说转漫剧: 220, 短剧转动漫: 110 },
  { day: '周三', 小说转漫剧: 195, 短剧转动漫: 130 },
  { day: '周四', 小说转漫剧: 260, 短剧转动漫: 148 },
  { day: '周五', 小说转漫剧: 310, 短剧转动漫: 175 },
  { day: '周六', 小说转漫剧: 380, 短剧转动漫: 220 },
  { day: '周日', 小说转漫剧: 290, 短剧转动漫: 196 },
];

const trendData = [
  { month: '11月', 用户数: 6200, 作品数: 28000 },
  { month: '12月', 用户数: 7800, 作品数: 38000 },
  { month: '1月', 用户数: 9100, 作品数: 52000 },
  { month: '2月', 用户数: 10300, 作品数: 63000 },
  { month: '3月', 用户数: 11400, 作品数: 74000 },
  { month: '4月', 用户数: 12847, 作品数: 86340 },
];

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [myWorks, setMyWorks] = useState({ total: 0, completed: 0, processing: 0 });
  const [myCreditsUsed, setMyCreditsUsed] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('works').select('status', { count: 'exact' }).eq('user_id', user.id).then(({ data, count }) => {
      const items = data ?? [];
      setMyWorks({
        total: count ?? 0,
        completed: items.filter(w => w.status === 'completed').length,
        processing: items.filter(w => w.status === 'processing').length,
      });
    });
    supabase.from('credit_logs').select('amount').eq('user_id', user.id).lt('amount', 0).then(({ data }) => {
      const used = (data ?? []).reduce((s, l) => s + Math.abs(l.amount ?? 0), 0);
      setMyCreditsUsed(used);
    });
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
          <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> 数据看板
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold text-balance">平台数据总览</h1>
        <p className="text-muted-foreground mt-1">实时统计平台关键指标</p>
      </div>

      {/* 平台核心指标 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {platformStats.map(item => (
          <Card key={item.label} className="h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl bg-card flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <Badge variant="secondary" className="text-[10px] text-emerald-400">{item.trend}</Badge>
              </div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 个人数据 */}
      {user && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> 我的数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '剩余积分', value: profile?.credits?.toLocaleString() ?? 0, icon: Zap, color: 'text-primary' },
                { label: '我的作品', value: myWorks.total, icon: Sparkles, color: 'text-violet-400' },
                { label: '已完成', value: myWorks.completed, icon: BookOpen, color: 'text-emerald-400' },
                { label: '累计消耗积分', value: myCreditsUsed.toLocaleString(), icon: TrendingUp, color: 'text-amber-400' },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-xl bg-background border border-border">
                  <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 图表区域 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* 本周生成分布 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" /> 本周生成任务分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  <Bar dataKey="小说转漫剧" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="短剧转动漫" fill="hsl(190 90% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 增长趋势 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> 平台增长趋势（近6月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8 }} />
                  <Line type="monotone" dataKey="用户数" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="作品数" stroke="hsl(190 90% 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 类型占比和近期数据 */}
      <div className="grid md:grid-cols-3 gap-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">内容类型占比</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: '小说转漫剧', pct: 58, icon: BookOpen, color: 'bg-primary' },
              { label: '短剧转动漫', pct: 42, icon: Film, color: 'bg-cyan-500' },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {item.label}
                  </div>
                  <span className="font-medium">{item.pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">画风使用排行</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { name: '二次元', pct: 42 },
              { name: '3D国漫', pct: 28 },
              { name: '写实风', pct: 16 },
              { name: '古风插画', pct: 9 },
              { name: '其他', pct: 5 },
            ].map((s, i) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className={`w-5 h-5 rounded flex items-center justify-center font-bold shrink-0 ${i < 3 ? 'gradient-primary-bg text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                <span className="flex-1 min-w-0 truncate">{s.name}</span>
                <span className="text-muted-foreground shrink-0">{s.pct}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> 实时动态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs text-muted-foreground">
            {[
              '用户 zhang*** 完成了一部小说转漫剧',
              '用户 li_*** 购买了进阶积分包',
              '用户 wang*** 申请了二级代理',
              '用户 chen** 完成短剧转动漫',
              '系统：今日生成任务已达 1,248 次',
            ].map((msg, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-pretty">{msg}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
