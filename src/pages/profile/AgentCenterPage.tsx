import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Crown, Star, Copy, Users, TrendingUp, Coins, Lock,
  ArrowRight, Gift, ChevronRight
} from 'lucide-react';
import RebateTrendChart from '@/components/agent/RebateTrendChart';
import AgentStatsPanel from '@/components/agent/AgentStatsPanel';

const LEVEL_CONFIG: Record<string, { label: string; color: string; icon: typeof Crown; rebate: number; fee: number }> = {
  agent1: { label: '一级代理', color: 'text-amber-400', icon: Crown,  rebate: 15, fee: 999 },
  agent2: { label: '二级代理', color: 'text-primary',   icon: Star,   rebate: 8,  fee: 399 },
};

export default function AgentCenterPage() {
  const { profile, refreshProfile } = useAuth();
  const [baseUrl, setBaseUrl] = useState('');
  const [agentFee, setAgentFee] = useState(0);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    // 触发 edge function 解冻检查（也会更新 profile）
    supabase.functions.invoke('unfreeze-rebate-credits', { method: 'POST' })
      .then(() => refreshProfile());

    // 读取该代理实际缴纳的入会费
    if (profile?.id && profile?.agent_level) {
      supabase
        .from('agent_applications')
        .select('fee')
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => { if (data) setAgentFee(Number(data.fee)); });
    }
  }, [profile?.id]);

  if (!profile) return null;

  const isAgent = profile.agent_level === 'agent1' || profile.agent_level === 'agent2';
  const cfg = LEVEL_CONFIG[profile.agent_level ?? ''];
  const promoLink = profile.invite_code ? `${baseUrl}/register?ref=${profile.invite_code}` : '';

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label}已复制`));
  };

  // 未成为代理 → 引导申请
  if (!isAgent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">代理中心</h1>
          <p className="text-sm text-muted-foreground mt-0.5">加入代理体系，推广返佣赚收益</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 二级代理 */}
          <Card className="border-primary/30 h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">二级代理</CardTitle>
                <Badge variant="outline" className="text-primary border-primary/30">入门推荐</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-2xl font-bold text-primary">8%</p>
                <p className="text-xs text-muted-foreground mt-0.5">推广返点比例</p>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground flex-1">
                <li className="flex items-center gap-2"><Gift className="w-3.5 h-3.5 text-primary shrink-0" />充值100元 → 返80积分</li>
                <li className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-primary shrink-0" />自充 + 推广充值均享返佣</li>
                <li className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />T+15天解冻，可申请提现</li>
              </ul>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">入门费：<strong className="text-foreground">¥399</strong></p>
                <Link to="/agent">
                  <Button className="w-full gradient-primary-bg border-0 text-white hover:opacity-90">
                    立即申请二级代理 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 一级代理 */}
          <Card className="border-amber-500/30 h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-base">一级代理</CardTitle>
                <Badge variant="outline" className="text-amber-400 border-amber-500/30">高级合作</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-3">
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
                <p className="text-2xl font-bold text-amber-400">15%</p>
                <p className="text-xs text-muted-foreground mt-0.5">推广返点比例</p>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground flex-1">
                <li className="flex items-center gap-2"><Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />充值100元 → 返150积分</li>
                <li className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />自充 + 推广充值均享返佣</li>
                <li className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />T+15天解冻，可申请提现</li>
              </ul>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">入门费：<strong className="text-foreground">¥999</strong></p>
                <Link to="/agent">
                  <Button variant="outline" className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                    立即申请一级代理 <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong className="text-foreground">平行独立架构</strong>：一级代理与二级代理均直接隶属平台，独立核算，互不影响收益。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 已是代理 → 展示代理中心
  const Icon = cfg.icon;
  const frozen    = Number(profile.rebate_credits_frozen    ?? 0);
  const available = Number(profile.rebate_credits_available ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary-bg flex items-center justify-center">
          <Icon className={`w-5 h-5 ${cfg.color === 'text-amber-400' ? 'text-amber-300' : 'text-white'}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            代理中心
            <Badge variant="outline" className={`${cfg.color} border-current`}>{cfg.label}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">返点比例 {cfg.rebate}%，充值100元返{cfg.rebate * 10}积分</p>
        </div>
      </div>

      {/* 积分概览 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />冻结中积分
            </div>
            <p className="text-2xl font-bold text-amber-400">{frozen.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">可消费·不可提现</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="w-3.5 h-3.5" />可提现积分
            </div>
            <p className="text-2xl font-bold text-green-400">{available.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">≈ ¥{(available / 10).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 推广链接 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">专属推广链接</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {promoLink ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-xs text-muted-foreground truncate">
                  {promoLink}
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => copy(promoLink, '推广链接')}>
                  <Copy className="w-3.5 h-3.5" />复制
                </Button>
              </div>
              {profile.invite_code && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">邀请码：</span>
                  <code className="px-2 py-0.5 bg-muted/40 rounded text-sm font-mono">{profile.invite_code}</code>
                  <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => copy(profile.invite_code!, '邀请码')}>
                    <Copy className="w-3 h-3" />复制
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">推广链接生成中…</p>
          )}
        </CardContent>
      </Card>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '推广记录', href: '/profile/agent/promotions', icon: Users },
          { label: '积分明细', href: '/profile/agent/points',     icon: Coins },
          { label: '申请提现', href: '/profile/agent/withdraw',   icon: TrendingUp },
          { label: '提现记录', href: '/profile/agent/withdrawals',icon: Lock },
        ].map(({ label, href, icon: Ico }) => (
          <Link key={href} to={href}>
            <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
              <CardContent className="pt-4 pb-3 flex flex-col items-center gap-2 text-center">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Ico className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 规则说明 */}
      <Card className="bg-muted/20 border-border/50">
        <CardContent className="pt-4 space-y-1.5 text-xs text-muted-foreground">
          <p>• 返佣范围：<strong className="text-foreground">自身充值 + 推广用户充值</strong>均按{cfg.rebate}%返点</p>
          <p>• 冻结规则：返佣积分默认进入冻结状态，<strong className="text-foreground">T+15天</strong>后自动解冻为可提现</p>
          <p>• 消费规则：消费时优先扣除冻结积分，消费后该部分积分<strong className="text-foreground">不可再提现</strong></p>
          <p>• 提现规则：最低提现 <strong className="text-foreground">500元（5000积分）</strong>，汇率10积分=1元</p>
        </CardContent>
      </Card>

      {/* 数据统计面板 */}
      <AgentStatsPanel
        agentId={profile.id}
        rebatePct={cfg.rebate}
        agentLevel={profile.agent_level ?? ''}
        fee={agentFee}
      />

      {/* 返佣积分趋势图 */}
      <RebateTrendChart agentId={profile.id} />
    </div>
  );
}
