import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CreditPackage, CreditLog } from '@/types';
import { Zap, Gift, CheckCircle2, History, ArrowUpCircle } from 'lucide-react';

export default function RechargePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [logs, setLogs] = useState<CreditLog[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('credit_packages').select('*').eq('is_active', true).eq('is_enterprise', false).order('sort_order').then(({ data }) => setPackages(data ?? []));
    supabase.from('credit_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10).then(({ data }) => setLogs(data ?? []));
  }, [user]);

  const handleBuy = async () => {
    if (!user || !selectedPkg) return;
    setBuying(true);
    try {
      const newCredits = (profile?.credits ?? 0) + selectedPkg.credits + selectedPkg.bonus_credits;
      await supabase.from('orders').insert({
        user_id: user.id, package_id: selectedPkg.id, amount: selectedPkg.price,
        credits: selectedPkg.credits + selectedPkg.bonus_credits,
        status: 'paid', pay_method: payMethod, paid_at: new Date().toISOString(),
        remark: `充值${selectedPkg.name}`,
      });
      await supabase.from('profiles').update({ credits: newCredits }).eq('id', user.id);
      await supabase.from('credit_logs').insert({
        user_id: user.id, amount: selectedPkg.credits + selectedPkg.bonus_credits,
        balance_after: newCredits, type: 'recharge', remark: `充值${selectedPkg.name}`,
      });
      await refreshProfile();
      const { data } = await supabase.from('credit_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
      setLogs(data ?? []);
      toast.success(`充值成功！获得 ${(selectedPkg.credits + selectedPkg.bonus_credits).toLocaleString()} 积分`);
      setSelectedPkg(null);
    } catch { toast.error('充值失败，请重试'); }
    finally { setBuying(false); }
  };

  return (
    <div className="space-y-6">
      {/* 余额展示 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">当前积分余额</p>
            <div className="text-4xl font-bold text-primary flex items-center gap-2">
              <Zap className="w-8 h-8" />
              {profile?.credits?.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <p className="flex items-center gap-1 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 积分永久有效</p>
            <p className="flex items-center gap-1"><ArrowUpCircle className="w-3.5 h-3.5 text-primary" /> 立即充值享赠送</p>
          </div>
        </CardContent>
      </Card>

      {/* 套餐选择 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">选择充值套餐</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {packages.map((pkg, i) => {
              const isRecommend = i === 1;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPkg(pkg)}
                  className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                    isRecommend ? 'border-primary' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {isRecommend && (
                    <Badge className="absolute -top-2 right-3 text-[10px] gradient-primary-bg text-white border-0">推荐</Badge>
                  )}
                  <div className="font-semibold text-sm mb-1">{pkg.name}</div>
                  <div className="text-xl font-bold">¥{pkg.price}</div>
                  <div className="text-xs text-muted-foreground mt-1">{pkg.credits.toLocaleString()} 积分</div>
                  {pkg.bonus_credits > 0 && (
                    <div className="text-xs text-emerald-400 flex items-center gap-0.5 mt-0.5">
                      <Gift className="w-3 h-3" /> +{pkg.bonus_credits.toLocaleString()} 赠送
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 充值记录 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> 积分记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">暂无记录</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{log.remark ?? log.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${log.amount > 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                      {log.amount > 0 ? '+' : ''}{log.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">余额 {log.balance_after.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 购买确认弹窗 */}
      <Dialog open={!!selectedPkg} onOpenChange={() => setSelectedPkg(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>确认充值</DialogTitle></DialogHeader>
          {selectedPkg && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">{selectedPkg.name}</span>
                  <span className="text-xl font-bold text-primary">¥{selectedPkg.price}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  获得 <strong className="text-foreground">{(selectedPkg.credits + selectedPkg.bonus_credits).toLocaleString()}</strong> 积分
                  {selectedPkg.bonus_credits > 0 && <span className="text-emerald-400 ml-1">（含赠 {selectedPkg.bonus_credits.toLocaleString()}）</span>}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm">支付方式</p>
                <div className="grid grid-cols-2 gap-3">
                  {[{ id: 'wechat', label: '微信支付', color: 'bg-green-500' }, { id: 'alipay', label: '支付宝', color: 'bg-blue-500' }].map(m => (
                    <button key={m.id} type="button" onClick={() => setPayMethod(m.id as typeof payMethod)}
                      className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${payMethod === m.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
                      <div className={`w-5 h-5 rounded ${m.color}`} />
                      <span className="text-sm">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPkg(null)}>取消</Button>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" onClick={handleBuy} disabled={buying}>
              {buying ? '处理中...' : `确认支付 ¥${selectedPkg?.price}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
