import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Share2, Copy, Users, DollarSign, TrendingUp, Download, Wallet, CheckCircle2, Clock, Image, FileText, Video, ExternalLink, Edit2, User } from 'lucide-react';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import html2canvas from 'html2canvas';

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

const POSTER_THEMES = [
  { id: 'violet', name: '星空紫', bgClass: 'bg-gradient-to-br from-violet-600 to-indigo-800' },
  { id: 'sunset', name: '日落橘', bgClass: 'bg-gradient-to-br from-orange-500 to-rose-500' },
  { id: 'ocean', name: '深海蓝', bgClass: 'bg-gradient-to-br from-blue-600 to-cyan-600' },
  { id: 'emerald', name: '极光绿', bgClass: 'bg-gradient-to-br from-emerald-500 to-teal-700' },
  { id: 'dark', name: '暗夜黑', bgClass: 'bg-gradient-to-br from-zinc-900 to-zinc-800' },
];

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
  const [editPromoOpen, setEditPromoOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [savingPromo, setSavingPromo] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterThemeId, setPosterThemeId] = useState(POSTER_THEMES[0].id);
  const posterRef = useRef<HTMLDivElement>(null);

  const promoLink = `${window.location.origin}/register?ref=${profile?.promo_code || user?.id?.slice(0, 8)}`;

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    try {
      const canvas = await html2canvas(posterRef.current, { useCORS: true, scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `推广海报_${profile?.promo_code || user?.id?.slice(0, 8)}.png`;
      a.click();
      toast.success('海报已保存');
    } catch (err) {
      toast.error('生成海报失败');
    }
  };

  const handleSavePromo = async () => {
    if (!user || !newPromoCode.trim()) return;
    const code = newPromoCode.trim().toUpperCase();
    if (code.length < 4 || code.length > 20) {
      toast.error('推广码长度需在 4-20 个字符之间');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      toast.error('推广码只能包含大写字母和数字');
      return;
    }

    setSavingPromo(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ promo_code: code })
        .eq('id', user.id);
      
      if (error) {
        if (error.code === '23505') { // UNIQUE constraint violation
          throw new Error('该推广码已被他人使用，请换一个');
        }
        throw error;
      }
      toast.success('专属推广码修改成功！');
      setEditPromoOpen(false);
      // reload page to reflect changes
      window.location.reload();
    } catch (err: any) {
      toast.error('修改失败', { description: err.message });
    } finally {
      setSavingPromo(false);
    }
  };

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
            <Button variant="ghost" size="sm" onClick={() => {
              setNewPromoCode(profile?.promo_code || '');
              setEditPromoOpen(true);
            }} className="h-8 px-2 text-xs">
              <Edit2 className="w-3.5 h-3.5 mr-1" /> 自定义推广码
            </Button>
          </div>
          <div className="flex gap-2">
            <Input value={promoLink} readOnly className="text-xs h-9 bg-background" />
            <Button size="sm" onClick={copyLink} className="shrink-0 gap-1.5">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPosterOpen(true)} className="shrink-0 gap-1.5">
              <Image className="w-3.5 h-3.5" />
              海报
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
      {/* 修改推广码弹窗 */}
      <Dialog open={editPromoOpen} onOpenChange={setEditPromoOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader><DialogTitle>自定义永久专属推广码</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">您的专属推广码</Label>
              <Input 
                placeholder="例如：MIAODA888" 
                value={newPromoCode} 
                onChange={e => setNewPromoCode(e.target.value.toUpperCase())} 
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">只能包含大写字母和数字，长度 4-20 位。修改后旧的推广码和推广链接将失效，请谨慎操作。</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPromoOpen(false)}>取消</Button>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" onClick={handleSavePromo} disabled={savingPromo}>
              {savingPromo ? '保存中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 推广海报弹窗 */}
      <Dialog open={posterOpen} onOpenChange={setPosterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>专属推广海报</DialogTitle>
          </DialogHeader>

          {/* 模板选择 */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
            {POSTER_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => setPosterThemeId(theme.id)}
                className={`relative shrink-0 w-12 h-12 rounded-lg border-2 transition-all ${theme.bgClass} ${
                  posterThemeId === theme.id ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                title={theme.name}
              >
                {posterThemeId === theme.id && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex justify-center bg-muted/30 p-4 rounded-xl">
            {/* 海报内容区 */}
            <div 
              ref={posterRef} 
              className={`w-full max-w-[300px] text-white rounded-2xl p-6 flex flex-col relative overflow-hidden transition-colors duration-300 ${POSTER_THEMES.find(t => t.id === posterThemeId)?.bgClass}`}
            >
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-8 -mb-8" />
              
              {/* 头像和信息 */}
              <div className="flex items-center gap-3 relative z-10 mb-6">
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg leading-tight truncate">{profile?.username || '神秘合伙人'}</p>
                  <p className="text-xs text-white/80 truncate">邀请你体验 AI 漫剧制作</p>
                </div>
              </div>

              {/* 核心文案 */}
              <div className="space-y-2 relative z-10 mb-8">
                <h3 className="text-2xl font-black italic tracking-wider">AI赋能创作</h3>
                <p className="text-sm text-white/90">一键将小说或短剧转为个性化动漫视频</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20">小说转漫剧</Badge>
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20">短剧转动漫</Badge>
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/20">无限创意</Badge>
                </div>
              </div>

              {/* 底部二维码 */}
              <div className="mt-auto bg-white text-black p-4 rounded-xl flex items-center gap-4 relative z-10">
                <div className="shrink-0 bg-white p-1 rounded-lg">
                   <QRCodeDataUrl text={promoLink} width={76} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-sm">扫码立即注册</p>
                  <p className="text-xs text-muted-foreground">新用户享免费创作积分</p>
                  <p className="text-[10px] text-muted-foreground mt-2">推广码: <strong className="text-primary">{profile?.promo_code || user?.id?.slice(0, 8)}</strong></p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPosterOpen(false)}>取消</Button>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90 gap-2" onClick={handleDownloadPoster}>
              <Download className="w-4 h-4" /> 保存海报
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
