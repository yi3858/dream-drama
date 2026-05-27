import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AgentConfig } from '@/types';
import {
  Users2, Crown, Star, CheckCircle2, ArrowRight, Zap, Shield,
  TrendingUp, Gift, ChevronUp, DollarSign, Share2, MessageCircle
} from 'lucide-react';

const HOW_IT_WORKS = [
  { step: '01', titleKey: 'agent_step1_title', descKey: 'agent_step1_desc' },
  { step: '02', titleKey: 'agent_step2_title', descKey: 'agent_step2_desc' },
  { step: '03', titleKey: 'agent_step3_title', descKey: 'agent_step3_desc' },
  { step: '04', titleKey: 'agent_step4_title', descKey: 'agent_step4_desc' },
] as const;

import { useLanguage } from '@/contexts/LanguageContext';

export default function AgentPage() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<AgentConfig | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from('agent_configs')
      .select('*')
      .order('fee')
      .then(({ data }) => {
        setConfigs((data as AgentConfig[]) ?? []);
        setLoading(false);
      });
  }, []);

  const currentAgentLevel = profile?.agent_level ?? 'none';
  // 升级时自动计算差价：一级代理费 - 已缴二级代理费
  const agent2Config = configs.find(c => c.level === 'agent2');
  const isUpgrading = selectedConfig?.level === 'agent1' && currentAgentLevel === 'agent2';
  const actualFee = isUpgrading && agent2Config
    ? Math.max(0, selectedConfig!.fee - agent2Config.fee)
    : (selectedConfig?.fee ?? 0);

  const handleApply = async () => {
    if (!user || !selectedConfig) return;
    if (!contactInfo.trim()) { toast.error(language === 'zh' ? '请填写联系方式' : (language === 'en' ? 'Please fill in contact info' : 'กรุณากรอกข้อมูลการติดต่อ')); return; }

    setSubmitting(true);
    try {
      const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const { data, error } = await supabase.functions.invoke('create_payment_order', {
        body: { 
          agent_config_id: selectedConfig.id, 
          contact_info: contactInfo, 
          reason,
          trade_type: isMobile ? 'H5' : 'NATIVE'
        },
      });
      if (error) {
        const msg = await error?.context?.text();
        toast.error(msg || (language === 'zh' ? '创建支付订单失败' : (language === 'en' ? 'Failed to create order' : 'สร้างคำสั่งซื้อไม่สำเร็จ')));
        return;
      }
      // 同步创建代理申请记录（供管理员审核）
      await supabase.from('agent_applications').insert({
        user_id:      user.id,
        level:        selectedConfig.level,
        fee:          actualFee,
        contact_info: contactInfo,
        reason:       reason,
        status:       'pending',
        order_id:     data.order_id ?? null,
      });
      // 跳转到订单详情页（含微信二维码轮询）
      setApplyDialogOpen(false);
      navigate(`/orders/${data.order_no}`);
    } catch {
      toast.error(language === 'zh' ? '网络错误，请重试' : (language === 'en' ? 'Network error, please try again' : 'ข้อผิดพลาดของเครือข่าย โปรดลองอีกครั้ง'));
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelBadge = (level: string) => {
    if (currentAgentLevel === level) return <Badge className="gradient-primary-bg text-white border-0 text-[10px]">{t('agent_current_level')}</Badge>;
    if (level === 'agent1' && currentAgentLevel === 'agent2') return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">{t('agent_upgrade')}</Badge>;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 标题 */}
      <div className="text-center mb-10">
        <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
          <Users2 className="w-3.5 h-3.5 mr-1.5" /> {t('nav_top_agent')}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{t('agent_title')}</h1>
        <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
          {t('agent_desc')}
        </p>
      </div>

      {/* 代理等级卡片 */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {loading ? (
          [...Array(2)].map((_, i) => <Card key={i} className="h-80 animate-pulse bg-muted" />)
        ) : configs.map((config, i) => {
          const isHighlight = i === 1;
          const isCurrentLevel = currentAgentLevel === config.level;
          const canUpgrade = config.level === 'agent1' && currentAgentLevel === 'agent2';

          return (
            <Card
              key={config.id}
              className={`h-full flex flex-col border-2 transition-all relative overflow-hidden ${
                isHighlight ? 'border-primary shadow-hover' : 'border-border hover:border-primary/40'
              }`}
            >
              {isHighlight && (
                <div className="absolute top-0 left-0 right-0 h-1 gradient-primary-bg" />
              )}
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHighlight ? 'gradient-primary-bg' : 'bg-muted'}`}>
                        {isHighlight ? <Crown className="w-4 h-4 text-white" /> : <Star className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <h3 className="text-xl font-bold">{t(`agent_level${config.level.replace('agent', '')}_name` as any) || config.name}</h3>
                      {getLevelBadge(config.level)}
                    </div>
                    <p className="text-sm text-muted-foreground text-pretty">{t(`agent_level${config.level.replace('agent', '')}_desc` as any) || config.description}</p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{config.rebate_pct}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('agent_rebate')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">¥{config.fee}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('agent_fee')}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4">
                {/* 权益列表 */}
                <div className="space-y-2">
                  {(config.benefits || []).map((b) => {
                    const benefitKeyMap: Record<string, string> = {
                      '专属推广链接': 'agent_b_exclusive_link',
                      '15%订单返点': 'agent_b_15_rebate',
                      '独家区域授权': 'agent_b_regional',
                      '优先客服支持': 'agent_b_priority_cs',
                      '周结算周期': 'agent_b_weekly_settle',
                      '推广素材定制': 'agent_b_custom_materials',
                      '专属对接经理': 'agent_b_exclusive_manager',
                      '8%订单返点': 'agent_b_8_rebate',
                      '官方推广素材': 'agent_b_official_materials',
                      '代理群支持': 'agent_b_group_support',
                      '月结算周期': 'agent_b_monthly_settle',
                    };
                    return (
                      <div key={b} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{benefitKeyMap[b] ? t(benefitKeyMap[b] as any) : b}</span>
                      </div>
                    );
                  })}
                </div>

                {/* 升级条件 */}
                {config.upgrade_condition && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <ChevronUp className="w-3.5 h-3.5 inline mr-1" />
                    {t('agent_upgrade_cond')}{t(`agent_level${config.level.replace('agent', '')}_cond` as any) || config.upgrade_condition}
                  </div>
                )}

                {/* 按钮 */}
                <div className="mt-auto">
                  {isCurrentLevel ? (
                    <Button className="w-full" variant="outline" onClick={() => navigate('/profile/promote')}>
                      {t('agent_goto_promote')} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full gradient-primary-bg border-0 text-white hover:opacity-90 gap-2"
                      onClick={() => { setSelectedConfig(config); setApplyDialogOpen(true); }}
                    >
                      <ChevronUp className="w-4 h-4" />
                      {t('agent_upgrade_to_agent1')}
                    </Button>
                  ) : currentAgentLevel === 'agent1' && config.level === 'agent2' ? (
                    <Button className="w-full" variant="outline" type="button" onClick={() => toast.info(t('agent_surpassed'))}>
                      {t('agent_surpassed')}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${isHighlight ? 'gradient-primary-bg border-0 text-white hover:opacity-90' : ''}`}
                      variant={isHighlight ? 'default' : 'outline'}
                      onClick={() => {
                        if (!user) { navigate('/login'); return; }
                        setSelectedConfig(config);
                        setApplyDialogOpen(true);
                      }}
                    >
                      {t('agent_apply_now')} {t(`agent_level${config.level.replace('agent', '')}_name` as any) || config.name} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 收益预估 */}
      <Card className="mb-12 border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-6 text-center">{t('agent_est_revenue')}</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            {configs.map(config => (
              <div key={config.id} className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  {t(`agent_level${config.level.replace('agent', '')}_name` as any) || config.name} {t('agent_est_revenue_desc')}
                </h4>
                <div className="space-y-2 text-sm">
                  {[
                    { users: 20, avgRecharge: 200 },
                    { users: 50, avgRecharge: 300 },
                    { users: 100, avgRecharge: 500 },
                  ].map(({ users, avgRecharge }) => {
                    const income = users * avgRecharge * config.rebate_pct / 100;
                    return (
                      <div key={users} className="flex items-center justify-between p-2.5 rounded-lg bg-background">
                        <span className="text-muted-foreground">
                          {t('agent_promote_users').replace('{users}', String(users)).replace('{avg}', String(avgRecharge))}
                        </span>
                        <span className="font-bold text-primary">¥{income.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">{t('agent_est_revenue_note')}</p>
        </CardContent>
      </Card>

      {/* 流程说明 */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-8 text-balance">{t('agent_how_it_works')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOW_IT_WORKS.map((item, i) => (
            <div key={item.step} className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl gradient-primary-bg flex items-center justify-center text-white text-xl font-bold mx-auto">
                {item.step}
              </div>
              <h4 className="font-semibold text-balance">{t(item.titleKey)}</h4>
              <p className="text-sm text-muted-foreground text-pretty">{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 平台保障 */}
      <div className="grid sm:grid-cols-3 gap-5 mb-12">
        {[
          { icon: Shield, title: t('agent_feature_1_title'), desc: t('agent_feature_1_desc'), color: 'text-emerald-400' },
          { icon: Zap, title: t('agent_feature_2_title'), desc: t('agent_feature_2_desc'), color: 'text-amber-400' },
          { icon: TrendingUp, title: t('agent_feature_3_title'), desc: t('agent_feature_3_desc'), color: 'text-cyan-400' },
          { icon: Gift, title: t('agent_feature_4_title'), desc: t('agent_feature_4_desc'), color: 'text-violet-400' },
          { icon: Share2, title: t('agent_feature_5_title'), desc: t('agent_feature_5_desc'), color: 'text-pink-400' },
          { icon: MessageCircle, title: t('agent_feature_6_title'), desc: t('agent_feature_6_desc'), color: 'text-orange-400' },
        ].map(item => (
          <div key={item.title} className="flex gap-3 p-4 rounded-xl border border-border hover:border-primary/30 bg-card hover:shadow-card transition-all">
            <item.icon className={`w-5 h-5 shrink-0 mt-0.5 ${item.color}`} />
            <div>
              <h4 className="font-medium text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground text-pretty">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 申请弹窗 */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isUpgrading 
                ? `${t('agent_upgrade_prefix')} ${t(`agent_level${selectedConfig?.level?.replace('agent', '')}_name` as any) || selectedConfig?.name}`
                : `${t('agent_apply_prefix')} ${t(`agent_level${selectedConfig?.level?.replace('agent', '')}_name` as any) || selectedConfig?.name}`
              }
            </DialogTitle>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t(`agent_level${selectedConfig.level.replace('agent', '')}_name` as any) || selectedConfig.name}</span>
                  {isUpgrading ? (
                    <span className="text-xl font-bold text-primary">¥{actualFee}</span>
                  ) : (
                    <span className="text-xl font-bold text-primary">¥{selectedConfig.fee}</span>
                  )}
                </div>
                {isUpgrading && agent2Config && (
                  <div className="space-y-1 text-sm border-t border-primary/10 pt-2 mt-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{language === 'zh' ? '一级代理原价' : (language === 'en' ? 'Level 1 Original Price' : 'ราคาเดิมตัวแทนระดับ 1')}</span>
                      <span>¥{selectedConfig.fee}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>{language === 'zh' ? '已缴二级代理费（抵扣）' : (language === 'en' ? 'Paid Level 2 Fee (Deducted)' : 'ชำระค่าธรรมเนียมระดับ 2 (หักออก)')}</span>
                      <span>- ¥{agent2Config.fee}</span>
                    </div>
                    <div className="flex justify-between font-bold text-primary border-t border-primary/10 pt-1 mt-1">
                      <span>{language === 'zh' ? '实际补差价' : (language === 'en' ? 'Actual Price Difference' : 'ส่วนต่างราคาจริง')}</span>
                      <span>¥{actualFee}</span>
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {t('agent_rebate')}：<strong className="text-primary">{selectedConfig.rebate_pct}%</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-normal">{t('agent_contact')}<span className="text-destructive">*</span></Label>
                <Input
                  placeholder=""
                  value={contactInfo}
                  onChange={e => setContactInfo(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">{t('agent_reason')}</Label>
                <Textarea
                  placeholder=""
                  className="min-h-[80px] resize-none"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>{t('agent_cancel')}</Button>
            <Button
              className="gradient-primary-bg border-0 text-white hover:opacity-90"
              onClick={handleApply}
              disabled={submitting}
            >
              {submitting
                ? t('agent_submitting')
                : isUpgrading
                  ? t('agent_upgrade_pay').replace('{fee}', String(actualFee))
                  : t('agent_apply_pay').replace('{fee}', String(selectedConfig?.fee || 0))
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
