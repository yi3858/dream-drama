import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { CreditPackage } from '@/types';
import {
  Crown, Zap, CheckCircle2, Users2, Clock, Gift, ArrowRight, Sparkles, Shield
} from 'lucide-react';

export default function PricingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'personal' | 'enterprise'>('personal');
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    supabase.from('credit_packages').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      setPackages(data ?? []);
      setLoading(false);
    });
  }, []);

  const personal = packages.filter(p => !p.is_enterprise);
  const enterprise = packages.filter(p => p.is_enterprise);

  const handleBuy = async () => {
    if (!user || !selectedPkg) return;
    setBuying(true);
    try {
      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        package_id: selectedPkg.id,
        amount: selectedPkg.price,
        credits: selectedPkg.credits + selectedPkg.bonus_credits,
        status: 'paid', // 模拟支付成功
        pay_method: payMethod,
        paid_at: new Date().toISOString(),
        remark: `购买 ${selectedPkg.name}`,
      });
      if (error) throw error;

      // 增加积分
      const newCredits = (profile?.credits ?? 0) + selectedPkg.credits + selectedPkg.bonus_credits;
      await supabase.from('profiles').update({ credits: newCredits }).eq('id', user.id);
      await supabase.from('credit_logs').insert({
        user_id: user.id,
        amount: selectedPkg.credits + selectedPkg.bonus_credits,
        balance_after: newCredits,
        type: 'recharge',
        remark: `购买${selectedPkg.name}`,
      });

      await refreshProfile();
      toast.success(`购买成功！已获得 ${(selectedPkg.credits + selectedPkg.bonus_credits).toLocaleString()} 积分`);
      setSelectedPkg(null);
    } catch (e) {
      toast.error('购买失败，请重试');
    } finally {
      setBuying(false);
    }
  };

  const personalHighlight = [1, 2]; // 推荐套餐索引

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 标题 */}
      <div className="text-center mb-10">
        <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
          <Crown className="w-3.5 h-3.5 mr-1.5" /> 积分套餐
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">按需购买，灵活充值</h1>
        <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
          纯积分按量计费，无订阅绑定，积分永久有效，用多少扣多少
        </p>
        {user && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm">当前积分：<strong className="text-primary">{profile?.credits?.toLocaleString() ?? 0}</strong></span>
          </div>
        )}
      </div>

      {/* 积分扣费说明 */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> 积分扣费规则
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">扣费公式</p>
              <p className="font-medium">10分（基础）+ 秒数 × 分辨率倍率</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">分辨率倍率</p>
              <div className="flex gap-3">
                {[{ label: '480P', val: '×0.6' }, { label: '720P', val: '×1.0' }, { label: '1080P', val: '×1.8' }].map(r => (
                  <span key={r.label} className="text-xs px-2 py-1 rounded bg-muted">
                    {r.label} <strong>{r.val}</strong>
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">失败退分</p>
              <p className="font-medium text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> 全额退还
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 个人/企业 切换 */}
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)} className="mb-8">
        <TabsList className="w-full max-w-xs">
          <TabsTrigger value="personal" className="flex-1 gap-2">
            <Zap className="w-4 h-4" /> 个人套餐
          </TabsTrigger>
          <TabsTrigger value="enterprise" className="flex-1 gap-2">
            <Users2 className="w-4 h-4" /> 企业团队
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 个人套餐 */}
      {tab === 'personal' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))
          ) : personal.map((pkg, i) => {
            const isHighlight = personalHighlight.includes(i);
            return (
              <Card
                key={pkg.id}
                className={`h-full flex flex-col border-2 transition-all hover:shadow-hover ${
                  isHighlight ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{pkg.name}</span>
                    {isHighlight && (
                      <Badge className="text-[10px] gradient-primary-bg text-white border-0">推荐</Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">¥{pkg.price}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">基础积分</span>
                      <span className="font-medium">{pkg.credits.toLocaleString()}</span>
                    </div>
                    {pkg.bonus_credits > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" /> 赠送积分
                        </span>
                        <span className="font-medium text-emerald-400">+{pkg.bonus_credits.toLocaleString()} ({pkg.bonus_pct}%)</span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-border flex items-center justify-between text-sm">
                      <span className="font-semibold">合计积分</span>
                      <span className="font-bold text-primary">{(pkg.credits + pkg.bonus_credits).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    积分永久有效
                  </div>
                  <Button
                    className={`mt-auto w-full ${isHighlight ? 'gradient-primary-bg border-0 text-white hover:opacity-90' : ''}`}
                    variant={isHighlight ? 'default' : 'outline'}
                    onClick={() => {
                      if (!user) { navigate('/login'); return; }
                      setSelectedPkg(pkg);
                    }}
                  >
                    立即购买
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 企业套餐 */}
      {tab === 'enterprise' && (
        <div className="grid sm:grid-cols-2 gap-5">
          {loading ? (
            [...Array(4)].map((_, i) => <Card key={i} className="h-72 animate-pulse bg-muted" />)
          ) : enterprise.map((pkg, i) => (
            <Card
              key={pkg.id}
              className={`h-full flex flex-col border-2 transition-all hover:shadow-hover ${i === 1 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{pkg.name}</span>
                  {i === 1 && <Badge className="gradient-primary-bg text-white border-0 text-[10px]">最受欢迎</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">¥{pkg.price.toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">基础积分</span>
                    <span className="font-medium">{pkg.credits.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" /> 赠送 ({pkg.bonus_pct}%)
                    </span>
                    <span className="font-medium text-emerald-400">+{pkg.bonus_credits.toLocaleString()}</span>
                  </div>
                  <div className="pt-1 border-t border-border flex items-center justify-between text-sm">
                    <span className="font-semibold">合计积分</span>
                    <span className="font-bold text-primary">{(pkg.credits + pkg.bonus_credits).toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    有效期 {pkg.validity_days} 天
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    最多 {pkg.max_members} 人共享
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    模型使用折扣 + 优先生成队列
                  </div>
                </div>
                <Button
                  className={`mt-auto w-full ${i === 1 ? 'gradient-primary-bg border-0 text-white hover:opacity-90' : ''}`}
                  variant={i === 1 ? 'default' : 'outline'}
                  onClick={() => {
                    if (!user) { navigate('/login'); return; }
                    setSelectedPkg(pkg);
                  }}
                >
                  立即购买 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 支付弹窗 */}
      <Dialog open={!!selectedPkg} onOpenChange={() => setSelectedPkg(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>确认购买</DialogTitle>
          </DialogHeader>
          {selectedPkg && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{selectedPkg.name}</span>
                  <span className="text-xl font-bold text-primary">¥{selectedPkg.price}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  获得 <strong className="text-foreground">{(selectedPkg.credits + selectedPkg.bonus_credits).toLocaleString()}</strong> 积分
                  {selectedPkg.bonus_credits > 0 && (
                    <span className="text-emerald-400 ml-1">（含赠送 {selectedPkg.bonus_credits.toLocaleString()} 积分）</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">选择支付方式</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'wechat', label: '微信支付', color: 'bg-green-500' },
                    { id: 'alipay', label: '支付宝', color: 'bg-blue-500' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as typeof payMethod)}
                      className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                        payMethod === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded ${m.color}`} />
                      <span className="text-sm font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPkg(null)}>取消</Button>
            <Button
              className="gradient-primary-bg border-0 text-white hover:opacity-90 gap-2"
              onClick={handleBuy}
              disabled={buying}
            >
              {buying ? '处理中...' : `确认支付 ¥${selectedPkg?.price}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
