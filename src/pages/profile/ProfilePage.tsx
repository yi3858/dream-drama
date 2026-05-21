import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Zap, ShoppingBag, Layers, Share2, Crown, ArrowRight, User } from 'lucide-react';

export default function ProfilePage() {
  const { profile } = useAuth();

  const quickLinks = [
    { label: '积分充值', href: '/profile/recharge', icon: Zap, desc: `当前 ${profile?.credits ?? 0} 积分` },
    { label: '订单管理', href: '/profile/orders', icon: ShoppingBag, desc: '查看充值、购买记录' },
    { label: '作品管理', href: '/profile/works', icon: Layers, desc: '管理你的所有作品' },
    { label: '推广后台', href: '/profile/promote', icon: Share2, desc: '代理推广收益中心' },
  ];

  return (
    <div className="space-y-6">
      {/* 用户信息卡 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-2xl gradient-primary-bg text-white">
                {profile?.username?.[0]?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold truncate">{profile?.username ?? '用户'}</h2>
                {profile?.agent_level !== 'none' && (
                  <Badge className="gradient-primary-bg text-white border-0 gap-1">
                    <Crown className="w-3 h-3" />
                    {profile?.agent_level === 'agent1' ? '一级代理' : '二级代理'}
                  </Badge>
                )}
                {profile?.role === 'admin' && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">管理员</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                注册于 {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.credits?.toLocaleString() ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> 剩余积分
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <div className="text-2xl font-bold">
                {profile?.agent_level === 'none' ? '普通用户' :
                  profile?.agent_level === 'agent2' ? '二级代理' : '一级代理'}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <User className="w-3 h-3" /> 账户等级
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-4">
        {quickLinks.map(item => (
          <Card key={item.href} className="border-border hover:border-primary/30 hover:shadow-card transition-all h-full">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground flex-1 text-pretty">{item.desc}</p>
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-between px-2 text-primary hover:bg-primary/5" asChild>
                <Link to={item.href}>
                  前往 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 升级代理入口 */}
      {profile?.agent_level === 'none' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" /> 升级为代理
              </h4>
              <p className="text-sm text-muted-foreground mt-1 text-pretty">成为代理商，每次推广充值可获得高额返点</p>
            </div>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90 shrink-0" size="sm" asChild>
              <Link to="/agent">了解详情</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
