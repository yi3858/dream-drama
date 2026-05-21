import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Share2, Copy, Users, DollarSign, TrendingUp, Download, Wallet, CheckCircle2, Clock, Image, FileText, Video, ExternalLink } from 'lucide-react';

interface PromoMaterial {
  id: string;
  title: string;
  type: string;
  file_url: string;
  description: string;
}

const MATERIAL_ICONS: Record<string, React.ElementType> = {
  poster: Image,
  banner: Image,
  video: Video,
  text: FileText,
};

export default function PromotePage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalOrders: 0, totalRebate: 0, pendingRebate: 0 });
  const [logs, setLogs] = useState<Array<{ id: string; rebate_amount: number; status: string; created_at: string; order_amount: number }>>([]);
  const [materials, setMaterials] = useState<PromoMaterial[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [minWithdraw, setMinWithdraw] = useState(100);
  const [copied, setCopied] = useState(false);

  const promoLink = `${window.location.origin}/register?ref=${profile?.promo_code || user?.id?.slice(0, 8)}`;

  useEffect(() => {
    if (!user) return;
    supabase.from('rebate_logs').select('*').eq('agent_id', user.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      const items = data ?? [];
      setLogs(items as typeof logs);
      const total = items.reduce((s, l) => s + (l.rebate_amount ?? 0), 0);
      const pending = items.filter(l => l.status === 'pending').reduce((s, l) => s + (l.rebate_amount ?? 0), 0);
      setStats(prev => ({ ...prev, totalRebate: total, pendingRebate: pending }));
    });
    supabase.from('profiles').select('id', { count: 'exact' }).eq('referrer_id', user.id).then(({ count }) => {
      setStats(prev => ({ ...prev, totalUsers: count ?? 0 }));
    });
    supabase.from('system_configs').select('value').eq('key', 'min_withdrawal').maybeSingle().then(({ data }) => {
      if (data) setMinWithdraw(Number(data.value));
    });
    // 加载推广素材
    supabase.from('promo_materials').select('*').order('sort_order').then(({ data }) => {
      setMaterials((data ?? []) as PromoMaterial[]);
    });
  }, [user]);

  const copyLink = () => {
    navigator.clipboard.writeText(promoLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('推广链接已复制');
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < minWithdraw) { toast.error(`最低提现金额为 ¥${minWithdraw}`); return; }
    if (amt > stats.pendingRebate) { toast.error('提现金额超出可用余额'); return; }
    if (!withdrawAccount.trim()) { toast.error('请填写收款账号'); return; }
    setSubmitting(true);
    try {
      await supabase.from('withdrawals').insert({
        agent_id: user!.id, amount: amt, status: 'pending',
        account_info: { type: 'wechat', account: withdrawAccount, name: profile?.username ?? '' },
        remark: '代理提现申请',
      });
      toast.success('提现申请已提交，预计3-5个工作日处理');
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawAccount('');
    } catch { toast.error('提现申请失败'); }
    finally { setSubmitting(false); }
  };

  const isAgent = profile?.agent_level !== 'none';

  if (!isAgent) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">成为代理，开启推广收益</h3>
          <p className="text-muted-foreground text-sm mb-5 text-pretty">申请代理资格后，即可获得专属推广链接并赚取返点</p>
          <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" asChild>
            <a href="/agent">了解代理详情</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* 代理信息 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge className="gradient-primary-bg text-white border-0">
                {profile?.agent_level === 'agent1' ? '一级代理' : '二级代理'}
              </Badge>
              <span className="text-sm text-muted-foreground">专属推广链接</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={promoLink} readOnly className="text-xs h-9 bg-background" />
            <Button size="sm" onClick={copyLink} className="shrink-0 gap-1.5">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '推广用户', value: stats.totalUsers, icon: Users, color: 'text-cyan-400' },
          { label: '累计返点', value: `¥${stats.totalRebate.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
          { label: '待结算', value: `¥${stats.pendingRebate.toFixed(2)}`, icon: Clock, color: 'text-amber-400' },
          { label: '总订单', value: stats.totalOrders, icon: TrendingUp, color: 'text-violet-400' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className="text-xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 提现 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> 收益提现</span>
            <Button size="sm" className="gradient-primary-bg border-0 text-white hover:opacity-90 h-8 gap-1.5" onClick={() => setWithdrawOpen(true)}>
              <Download className="w-3.5 h-3.5" /> 申请提现
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between text-sm mb-4">
            <span className="text-muted-foreground">可提现余额</span>
            <span className="font-bold text-primary">¥{stats.pendingRebate.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground">最低提现 ¥{minWithdraw}，提现后1-3工作日到账</p>
        </CardContent>
      </Card>

      {/* 返点记录 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">返点明细</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">暂无返点记录</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm">订单金额 ¥{log.order_amount?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">+¥{log.rebate_amount.toFixed(2)}</p>
                    <Badge variant="outline" className={`text-[10px] ${log.status === 'settled' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-300 border-amber-500/30'}`}>
                      {log.status === 'settled' ? '已结算' : '待结算'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 推广素材中心 */}
      {materials.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" /> 推广素材中心
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {materials.map(mat => {
                const Icon = MATERIAL_ICONS[mat.type] ?? FileText;
                return (
                  <div key={mat.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/30 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mat.title}</p>
                      {mat.description && (
                        <p className="text-xs text-muted-foreground text-pretty mt-0.5 line-clamp-2">{mat.description}</p>
                      )}
                      <Badge variant="outline" className="text-[10px] mt-1.5">{mat.type}</Badge>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          navigator.clipboard.writeText(mat.file_url);
                          toast.success('素材链接已复制');
                        }}
                      >
                        <Copy className="w-3 h-3" /> 复制
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer" download>
                          <ExternalLink className="w-3 h-3" /> 查看
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 提现弹窗 */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>申请提现</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">可提现余额</span>
              <span className="font-bold text-primary">¥{stats.pendingRebate.toFixed(2)}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">提现金额 <span className="text-destructive">*</span></Label>
              <Input placeholder={`最低 ¥${minWithdraw}`} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} type="number" min={minWithdraw} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">收款账号（微信号/支付宝账号）<span className="text-destructive">*</span></Label>
              <Input placeholder="请输入收款账号" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>取消</Button>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" onClick={handleWithdraw} disabled={submitting}>
              {submitting ? '提交中...' : '提交申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
