import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Clock, ArrowRight, Gift, CreditCard, AlertCircle, Lock, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PointPackage {
  id: string;
  total_points: number;
  remain_points: number;
  point_type: 'recharge' | 'gift';
  source_type: string;
  expired_at: string | null;
  created_at: string;
}

export default function WalletPage() {
  const { user, profile } = useAuth();
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWallet() {
      if (!user) return;
      const { data } = await supabase
        .from('user_point_packages')
        .select('*')
        .eq('user_id', user.id)
        .gt('remain_points', 0)
        .order('expired_at', { ascending: true, nullsFirst: false });
      
      if (data) setPackages(data as PointPackage[]);
      setLoading(false);
    }
    fetchWallet();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const rechargePoints = packages.filter(p => p.point_type === 'recharge').reduce((sum, p) => sum + p.remain_points, 0);
  const giftPoints = packages.filter(p => p.point_type === 'gift').reduce((sum, p) => sum + p.remain_points, 0);
  const totalPoints = rechargePoints + giftPoints;
  const frozenRebate    = Number(profile?.rebate_credits_frozen    ?? 0);
  const availableRebate = Number(profile?.rebate_credits_available ?? 0);
  const isAgent = profile?.agent_level === 'agent1' || profile?.agent_level === 'agent2';

  // 检查是否在7天内过期
  const isExpiringSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr).getTime();
    const now = Date.now();
    const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 7;
  };

  const calculateDaysLeft = (dateStr: string | null) => {
    if (!dateStr) return '永久有效';
    const expiry = new Date(dateStr).getTime();
    const now = Date.now();
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft}天后过期` : '已过期';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的钱包</h1>
          <p className="text-sm text-muted-foreground mt-1">管理您的积分资产</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/profile/credits">积分明细</Link>
          </Button>
          <Button asChild className="gradient-primary-bg border-0">
            <Link to="/profile/recharge">去充值</Link>
          </Button>
        </div>
      </div>

      {/* 总览卡片 */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> 总可用积分
              </p>
              <h2 className="text-5xl font-bold tracking-tight text-primary">
                {totalPoints.toLocaleString()}
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border flex-1 min-w-[100px]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CreditCard className="w-4 h-4" /> 充值积分
                </div>
                <div className="text-2xl font-bold">{rechargePoints.toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border flex-1 min-w-[100px]">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Gift className="w-4 h-4" /> 赠送积分
                </div>
                <div className="text-2xl font-bold">{giftPoints.toLocaleString()}</div>
              </div>
              {isAgent && (
                <>
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex-1 min-w-[120px]">
                    <div className="flex items-center gap-1.5 text-sm mb-1">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 text-xs">返佣冻结中</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{frozenRebate.toLocaleString()}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex-1 min-w-[120px]">
                    <div className="flex items-center gap-1.5 text-sm mb-1">
                      <Coins className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-xs">可提现积分</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">{availableRebate.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">≈ ¥{(availableRebate / 10).toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-primary/10 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <p>消耗规则：系统将优先扣除即将过期的赠送积分，再扣除充值积分。</p>
          </div>
        </CardContent>
      </Card>

      {/* 积分包列表 */}
      <Card>
        <CardHeader>
          <CardTitle>积分包明细</CardTitle>
          <CardDescription>这里展示您当前所有可用的积分包及其有效期</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all">全部可用 ({packages.length})</TabsTrigger>
              <TabsTrigger value="recharge">充值积分</TabsTrigger>
              <TabsTrigger value="gift">赠送积分</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {packages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">暂无可用积分包</div>
              ) : (
                packages.map(p => <PackageCard key={p.id} pkg={p} isExpiringSoon={isExpiringSoon} calculateDaysLeft={calculateDaysLeft} />)
              )}
            </TabsContent>
            
            <TabsContent value="recharge" className="space-y-4">
              {packages.filter(p => p.point_type === 'recharge').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">暂无充值积分</div>
              ) : (
                packages.filter(p => p.point_type === 'recharge').map(p => <PackageCard key={p.id} pkg={p} isExpiringSoon={isExpiringSoon} calculateDaysLeft={calculateDaysLeft} />)
              )}
            </TabsContent>
            
            <TabsContent value="gift" className="space-y-4">
              {packages.filter(p => p.point_type === 'gift').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">暂无赠送积分</div>
              ) : (
                packages.filter(p => p.point_type === 'gift').map(p => <PackageCard key={p.id} pkg={p} isExpiringSoon={isExpiringSoon} calculateDaysLeft={calculateDaysLeft} />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function PackageCard({ pkg, isExpiringSoon, calculateDaysLeft }: { pkg: PointPackage, isExpiringSoon: (d: string|null) => boolean, calculateDaysLeft: (d: string|null) => string }) {
  const expiring = isExpiringSoon(pkg.expired_at);
  
  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
      expiring ? 'bg-amber-500/5 border-amber-500/30' : 'bg-card'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          pkg.point_type === 'recharge' ? 'bg-blue-500/15 text-blue-500' : 'bg-emerald-500/15 text-emerald-500'
        }`}>
          {pkg.point_type === 'recharge' ? <CreditCard className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{pkg.point_type === 'recharge' ? '充值积分' : '活动赠送积分'}</span>
            <Badge variant="outline" className="text-xs">
              {pkg.source_type === 'order' ? '在线充值' : 
               pkg.source_type === 'register' ? '新人注册' : 
               pkg.source_type === 'invite' ? '邀请奖励' : 
               pkg.source_type === 'admin_gift' ? '系统后台发放' : '系统补发'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>初始发放: {pkg.total_points}</span>
            <span>·</span>
            <span>发放时间: {new Date(pkg.created_at).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-lg font-bold text-primary">
          可用: {pkg.remain_points}
        </div>
        <div className={`text-xs mt-1 flex items-center justify-end gap-1 ${
          expiring ? 'text-amber-500 font-medium' : 'text-muted-foreground'
        }`}>
          <Clock className="w-3 h-3" />
          {calculateDaysLeft(pkg.expired_at)}
        </div>
      </div>
    </div>
  );
}