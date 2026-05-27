import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { CreditPackage } from '@/types';
import { useRechargeModal } from '@/contexts/RechargeModalContext';
import {
  Crown, Zap, CheckCircle2, Users2, Clock, Gift, ArrowRight, Sparkles, Shield, MessageCircle, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PricingPage() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { openRechargeModal } = useRechargeModal();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'personal' | 'enterprise'>('personal');

  useEffect(() => {
    supabase.from('credit_packages').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      setPackages(data ?? []);
      setLoading(false);
    });
  }, []);

  const personal = packages.filter(p => !p.is_enterprise);
  const enterprise = packages.filter(p => p.is_enterprise);

  const handleBuyClick = () => {
    if (!user) { navigate('/login'); return; }
    openRechargeModal();
  };

  const personalHighlight = [1, 2];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 测试阶段提示横幅 */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/8 px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">网站测试阶段公告</p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            目前网站还在测试阶段，<strong className="text-foreground">暂不支持自动在线支付</strong>，请点击下方按钮联系客服进行在线充值，我们将第一时间为您处理。
          </p>
        </div>
      </div>
      {/* 标题 */}
      <div className="text-center mb-10">
        <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
          <Crown className="w-3.5 h-3.5 mr-1.5" /> 积分套餐
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{t('pricing_title')}</h1>
        <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
          {t('pricing_desc')}
        </p>
        {user && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm">{t('pricing_current_credits')}<strong className="text-primary">{profile?.credits?.toLocaleString() ?? 0}</strong></span>
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
              <p className="text-muted-foreground">{language === 'zh' ? '失败退分' : (language === 'en' ? 'Failure Refund' : 'คืนเงินเมื่อล้มเหลว')}</p>
              <p className="font-medium text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {language === 'zh' ? '全额退还' : (language === 'en' ? 'Full Refund' : 'คืนเงินเต็มจำนวน')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 个人/企业 切换 */}
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)} className="mb-8">
        <TabsList className="w-full max-w-xs">
          <TabsTrigger value="personal" className="flex-1 gap-2">
            <Zap className="w-4 h-4" /> {t('pricing_personal')}
          </TabsTrigger>
          <TabsTrigger value="enterprise" className="flex-1 gap-2">
            <Users2 className="w-4 h-4" /> {t('pricing_enterprise')}
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
                    <span className="font-semibold">
                      {pkg.name === '入门包' ? t('pkg_starter') :
                       pkg.name === '基础包' ? t('pkg_basic') :
                       pkg.name === '进阶包' ? t('pkg_advanced') :
                       pkg.name === '专业包' ? t('pkg_pro') : pkg.name}
                    </span>
                    {isHighlight && (
                      <Badge className="text-[10px] gradient-primary-bg text-white border-0">{t('pricing_recommended')}</Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">¥{pkg.price}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('pricing_base_credits')}</span>
                      <span className="font-medium">{pkg.credits.toLocaleString()}</span>
                    </div>
                    {pkg.bonus_credits > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" /> {t('pricing_bonus_credits')}
                        </span>
                        <span className="font-medium text-emerald-400">+{pkg.bonus_credits.toLocaleString()} ({pkg.bonus_pct}%)</span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-border flex items-center justify-between text-sm">
                      <span className="font-semibold">{t('pricing_total_credits')}</span>
                      <span className="font-bold text-primary">{(pkg.credits + pkg.bonus_credits).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {pkg.validity_days ? t('pricing_validity_days').replace('{0}', pkg.validity_days.toString()) : t('pricing_valid_forever')}
                  </div>
                  <Button
                    className={`mt-auto w-full gap-1.5 ${isHighlight ? 'gradient-primary-bg border-0 text-white hover:opacity-90' : ''}`}
                    variant={isHighlight ? 'default' : 'outline'}
                    onClick={handleBuyClick}
                  >{"联系客服充值"}</Button>
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
                  <span className="font-semibold">
                    {pkg.name === '企业基础版' ? t('pkg_ent_basic') :
                     pkg.name === '企业标准版' ? t('pkg_ent_std') :
                     pkg.name === '企业专业版' ? t('pkg_ent_pro') :
                     pkg.name === '企业旗舰版' ? t('pkg_ent_flagship') : pkg.name}
                  </span>
                  {i === 1 && <Badge className="gradient-primary-bg text-white border-0 text-[10px]">{t('pricing_popular')}</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">¥{pkg.price.toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('pricing_base_credits')}</span>
                    <span className="font-medium">{pkg.credits.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" /> {t('pricing_bonus_credits')} ({pkg.bonus_pct}%)
                    </span>
                    <span className="font-medium text-emerald-400">+{pkg.bonus_credits.toLocaleString()}</span>
                  </div>
                  <div className="pt-1 border-t border-border flex items-center justify-between text-sm">
                    <span className="font-semibold">{t('pricing_total_credits')}</span>
                    <span className="font-bold text-primary">{(pkg.credits + pkg.bonus_credits).toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {t('pricing_validity_days').replace('{0}', pkg.validity_days?.toString() ?? '')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {t('pricing_max_members').replace('{0}', pkg.max_members?.toString() ?? '')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    {t('pricing_discount')}
                  </div>
                </div>
                <Button
                  className={`mt-auto w-full gap-1.5 ${i === 1 ? 'gradient-primary-bg border-0 text-white hover:opacity-90' : ''}`}
                  variant={i === 1 ? 'default' : 'outline'}
                  onClick={handleBuyClick}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  联系客服充值 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
