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
  { step: '01', title: '选择代理等级', desc: '根据自身资源选择合适的代理级别' },
  { step: '02', title: '缴纳代理费', desc: '完成代理费支付，获得代理资格' },
  { step: '03', title: '获取推广链接', desc: '在推广后台获取专属推广链接和素材' },
  { step: '04', title: '推广赚返点', desc: '用户通过你的链接充值，自动获得返点收益' },
];

export default function AgentPage() {
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
    if (!contactInfo.trim()) { toast.error('请填写联系方式'); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create_payment_order', {
        body: { agent_config_id: selectedConfig.id, contact_info: contactInfo, reason },
      });
      if (error) {
        const msg = await error?.context?.text();
        toast.error(msg || '创建支付订单失败，请重试');
        return;
      }
      // 跳转到订单详情页（含微信二维码轮询）
      setApplyDialogOpen(false);
      navigate(`/orders/${data.order_no}`);
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelBadge = (level: string) => {
    if (currentAgentLevel === level) return <Badge className="gradient-primary-bg text-white border-0 text-[10px]">当前等级</Badge>;
    if (level === 'agent1' && currentAgentLevel === 'agent2') return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">可升级</Badge>;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* 标题 */}
      <div className="text-center mb-10">
        <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
          <Users2 className="w-3.5 h-3.5 mr-1.5" /> 代理招商
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">加入筑梦呈剧代理体系</h1>
        <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
          两级代理架构，稳定返点收益，助力你打造专属变现渠道
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
                      <h3 className="text-xl font-bold">{config.name}</h3>
                      {getLevelBadge(config.level)}
                    </div>
                    <p className="text-sm text-muted-foreground text-pretty">{config.description}</p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{config.rebate_pct}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">订单返点比例</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">¥{config.fee}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">一次性代理费</p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4">
                {/* 权益列表 */}
                <div className="space-y-2">
                  {(config.benefits || []).map((b) => (
                    <div key={b} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                {/* 升级条件 */}
                {config.upgrade_condition && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <ChevronUp className="w-3.5 h-3.5 inline mr-1" />
                    升级条件：{config.upgrade_condition}
                  </div>
                )}

                {/* 按钮 */}
                <div className="mt-auto">
                  {isCurrentLevel ? (
                    <Button className="w-full" variant="outline" onClick={() => navigate('/profile/promote')}>
                      进入推广后台 <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full gradient-primary-bg border-0 text-white hover:opacity-90 gap-2"
                      onClick={() => { setSelectedConfig(config); setApplyDialogOpen(true); }}
                    >
                      <ChevronUp className="w-4 h-4" />
                      升级为一级代理
                    </Button>
                  ) : currentAgentLevel === 'agent1' && config.level === 'agent2' ? (
                    <Button className="w-full" variant="outline" type="button" onClick={() => toast.info('你已超越此级别')}>
                      已超越此级别
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
                      立即申请 {config.name} <ArrowRight className="w-4 h-4 ml-1" />
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
          <h3 className="text-xl font-bold mb-6 text-center">💰 月收益预估</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            {configs.map(config => (
              <div key={config.id} className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  {config.name} 收益示例
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
                          推广{users}人，人均充值¥{avgRecharge}
                        </span>
                        <span className="font-bold text-primary">¥{income.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">* 仅供参考，实际收益与推广力度相关</p>
        </CardContent>
      </Card>

      {/* 流程说明 */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-8 text-balance">成为代理，4步开始赚钱</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOW_IT_WORKS.map((item, i) => (
            <div key={item.step} className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl gradient-primary-bg flex items-center justify-center text-white text-xl font-bold mx-auto">
                {item.step}
              </div>
              <h4 className="font-semibold text-balance">{item.title}</h4>
              <p className="text-sm text-muted-foreground text-pretty">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 平台保障 */}
      <div className="grid sm:grid-cols-3 gap-5 mb-12">
        {[
          { icon: Shield, title: '平台背书', desc: '正规运营平台，合法合规，放心推广', color: 'text-emerald-400' },
          { icon: Zap, title: '实时到账', desc: '用户充值后返点自动计入代理账户', color: 'text-amber-400' },
          { icon: TrendingUp, title: '持续增长', desc: 'AI漫剧市场持续爆发，先入场先占位', color: 'text-cyan-400' },
          { icon: Gift, title: '推广素材', desc: '提供海报、视频、话术等一站式推广素材', color: 'text-violet-400' },
          { icon: Share2, title: '专属链接', desc: '一键生成专属推广链接，精准追踪转化', color: 'text-pink-400' },
          { icon: MessageCircle, title: '专属客服', desc: '代理商专属对接经理，快速响应解答', color: 'text-orange-400' },
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
              {isUpgrading ? `升级 ${selectedConfig?.name}` : `申请 ${selectedConfig?.name}`}
            </DialogTitle>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{selectedConfig.name}</span>
                  {isUpgrading ? (
                    <span className="text-xl font-bold text-primary">¥{actualFee}</span>
                  ) : (
                    <span className="text-xl font-bold text-primary">¥{selectedConfig.fee}</span>
                  )}
                </div>
                {isUpgrading && agent2Config && (
                  <div className="space-y-1 text-sm border-t border-primary/10 pt-2 mt-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>一级代理原价</span>
                      <span>¥{selectedConfig.fee}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>已缴二级代理费（抵扣）</span>
                      <span>- ¥{agent2Config.fee}</span>
                    </div>
                    <div className="flex justify-between font-bold text-primary border-t border-primary/10 pt-1 mt-1">
                      <span>实际补差价</span>
                      <span>¥{actualFee}</span>
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  返点比例：<strong className="text-primary">{selectedConfig.rebate_pct}%</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-normal">联系方式（微信/手机号）<span className="text-destructive">*</span></Label>
                <Input
                  placeholder="请留下你的微信号或手机号，便于对接"
                  value={contactInfo}
                  onChange={e => setContactInfo(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">推广资源介绍（可选）</Label>
                <Textarea
                  placeholder="简单描述你的推广资源，如：自媒体粉丝数、社群规模等"
                  className="min-h-[80px] resize-none"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>取消</Button>
            <Button
              className="gradient-primary-bg border-0 text-white hover:opacity-90"
              onClick={handleApply}
              disabled={submitting}
            >
              {submitting
                ? '提交中...'
                : isUpgrading
                  ? `补差价 ¥${actualFee} 升级一级代理`
                  : `缴纳 ¥${selectedConfig?.fee} 申请代理`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
