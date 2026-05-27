import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowDownToLine, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACCOUNT_TYPES = [
  { value: 'wechat', label: '微信收款' },
  { value: 'alipay', label: '支付宝' },
  { value: 'bank',   label: '银行卡' },
];

export default function AgentWithdrawApplyPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [exchangeRate, setExchangeRate] = useState(10);
  const [minCredits, setMinCredits]     = useState(5000);
  const [minWithdraw, setMinWithdraw]   = useState(500);
  const [amount, setAmount]             = useState('');
  const [accountType, setAccountType]   = useState('');
  const [accountNo, setAccountNo]       = useState('');
  const [accountName, setAccountName]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    supabase.from('system_configs').select('key,value')
      .in('key', ['credits_exchange_rate', 'min_withdraw_credits', 'min_withdrawal'])
      .then(({ data }) => {
        (data ?? []).forEach(r => {
          if (r.key === 'credits_exchange_rate') setExchangeRate(Number(r.value));
          if (r.key === 'min_withdraw_credits')  setMinCredits(Number(r.value));
          if (r.key === 'min_withdrawal')        setMinWithdraw(Number(r.value));
        });
      });
    if (profile?.id) refreshProfile();
  }, []);

  const available = Number(profile?.rebate_credits_available ?? 0);
  const maxAmount = Math.floor(available / exchangeRate);
  const creditsNeeded = amount ? Math.ceil(Number(amount) * exchangeRate) : 0;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt < minWithdraw) { toast.error(`最低提现 ¥${minWithdraw}`); return; }
    if (creditsNeeded > available)  { toast.error('可提现积分不足'); return; }
    if (!accountType || !accountNo || !accountName) { toast.error('请完整填写收款信息'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('withdrawals').insert({
      agent_id: profile!.id,
      amount:   amt,
      credits_amount: creditsNeeded,
      account_info: { type: accountType, account: accountNo, name: accountName },
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { toast.error('提交失败，请重试'); return; }
    toast.success('提现申请已提交，审核通过后3-5个工作日到账');
    navigate('/profile/agent/withdrawals');
  };

  if (!profile) return null;

  const isAgent = profile.agent_level === 'agent1' || profile.agent_level === 'agent2';
  if (!isAgent) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">申请提现</h1>
        <Card><CardContent className="pt-6 text-center text-muted-foreground py-16">您还不是代理，无法申请提现</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><ArrowDownToLine className="w-5 h-5 text-primary" />申请提现</h1>
        <p className="text-sm text-muted-foreground mt-0.5">将可提现积分兑换为现金</p>
      </div>

      {/* 当前可提现积分 */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">可提现积分</span>
            <span className="text-xl font-bold text-green-400">{available.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">可提现金额上限</span>
            <span className="font-medium">¥{maxAmount.toLocaleString()}</span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            汇率：{exchangeRate}积分 = 1元，最低提现 ¥{minWithdraw}（{minCredits}积分）
          </div>
        </CardContent>
      </Card>

      {/* 提现表单 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">填写提现信息</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">提现金额（元）</Label>
            <Input
              type="number"
              min={minWithdraw}
              max={maxAmount}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`最低 ¥${minWithdraw}，最高 ¥${maxAmount}`}
            />
            {amount && (
              <p className="text-xs text-muted-foreground">
                将消耗 <strong className="text-foreground">{creditsNeeded.toLocaleString()}</strong> 积分
                {creditsNeeded > available && <span className="text-destructive ml-1">（积分不足）</span>}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-normal">收款方式</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger><SelectValue placeholder="请选择收款方式" /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-normal">账号/卡号</Label>
            <Input value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="请输入收款账号" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-normal">姓名</Label>
            <Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="请输入收款人真实姓名" />
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
            提现申请提交后将进入审核流程，审核通过后 3-5 个工作日内到账
          </div>

          <Button
            className="w-full gradient-primary-bg border-0 text-white hover:opacity-90"
            onClick={submit}
            disabled={submitting || available < minCredits}
          >
            {submitting ? '提交中…' : available < minCredits ? `可提现积分不足 ${minCredits}` : '提交提现申请'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
