import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRechargeModal } from '@/contexts/RechargeModalContext';
import type { CreditPackage, CreditLog } from '@/types';
import {
  Zap, Gift, CheckCircle2, History, ArrowUpCircle,
  MessageCircle, AlertTriangle,
} from 'lucide-react';

export default function RechargePage() {
  const { user, profile } = useAuth();
  const { openRechargeModal } = useRechargeModal();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [logs, setLogs] = useState<CreditLog[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('credit_packages').select('*').eq('is_active', true).eq('is_enterprise', false).order('sort_order')
      .then(({ data }) => setPackages(data ?? []));
    supabase.from('credit_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setLogs(data ?? []));
  }, [user]);

  return (
    <div className="space-y-6">
      {/* 测试阶段公告 */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/8 px-4 py-3.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-amber-600 dark:text-amber-400">网站测试阶段公告：</strong>
          暂不支持自动在线支付，请联系客服进行在线充值，我们将第一时间为您处理。
        </p>
      </div>

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
            <p className="flex items-center gap-1"><ArrowUpCircle className="w-3.5 h-3.5 text-primary" /> 联系客服充值</p>
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
                  onClick={openRechargeModal}
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
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 rounded-lg py-1.5">
                    <MessageCircle className="w-3.5 h-3.5" /> 联系客服充值
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 积分记录 */}
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
                    {log.balance_after !== undefined && (
                      <p className="text-xs text-muted-foreground">余额 {log.balance_after.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

