import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CountdownButton } from '@/components/ui/countdown-button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, User, Lock, ShieldCheck, Phone, Mail, KeyRound, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

// ── 手机号登录表单 ────────────────────────────────────────────────
interface PhoneLoginForm {
  phone: string;
  code: string;
  password: string;
}

// ── 邮箱登录表单 ─────────────────────────────────────────────────
interface EmailLoginForm {
  email: string;
  code: string;
  password: string;
}

const getCountryCodes = (t: (key: any) => string) => [
  { value: '+86', label: `+86 (${t('country_86')})` },
  { value: '+1',  label: `+1 (${t('country_1')})` },
  { value: '+81', label: `+81 (${t('country_81')})` },
  { value: '+82', label: `+82 (${t('country_82')})` },
  { value: '+44', label: `+44 (${t('country_44')})` },
  { value: '+66', label: `+66 (${t('country_66')})` },
  { value: '+852', label: `+852 (${t('country_852')})` },
  { value: '+886', label: `+886 (${t('country_886')})` },
  { value: '+853', label: `+853 (${t('country_853')})` },
];

// ─────────────────────────────────────────────────────────────────
//  手机号登录子表单
// ─────────────────────────────────────────────────────────────────
function PhoneLoginForm({ from }: { from: string }) {
  const { t } = useLanguage();
  const { signInWithPhone } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+86');
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');
  const [sessionId, setSessionId] = useState('');

  const COUNTRY_CODES = getCountryCodes(t);
  const form = useForm<PhoneLoginForm>({ defaultValues: { phone: '', code: '', password: '' } });

  const handleSendCode = async () => {
    let phone = form.getValues('phone');
    if (!phone || !/^\d{5,15}$/.test(phone)) {
      toast.error('请输入有效的手机号码');
      return false;
    }
    phone = phone.trim();
    if (!phone.startsWith('+')) phone = countryCode + phone;
    try {
      const { supabase } = await import('@/db/supabase');
      const { data, error } = await supabase.functions.invoke('send-sms-code', { body: { mobile: phone } });
      if (error) throw error;
      if (data.status !== 0) throw new Error(data.msg || '发送失败');
      setSessionId(data.data.sessionId);
      toast.success('验证码已发送');
      return true;
    } catch (e: any) {
      toast.error(e.message || '发送失败，请稍后再试');
      return false;
    }
  };

  const onSubmit = async (values: PhoneLoginForm) => {
    setLoading(true);
    let phoneStr = values.phone.trim();
    if (!phoneStr.startsWith('+')) phoneStr = countryCode + phoneStr;

    if (loginMethod === 'code') {
      if (!sessionId) { toast.error('请先获取验证码'); setLoading(false); return; }
      try {
        const { supabase } = await import('@/db/supabase');
        const { data: vData, error: vError } = await supabase.functions.invoke('verify-sms-code', {
          body: { mobile: phoneStr, code: values.code, sessionId },
        });
        if (vError) throw vError;
        if (vData.status !== 0) throw new Error(vData.msg || '验证失败');
        toast.error('验证码登录成功，但尚未配置短信 Token 获取，请使用密码登录');
        setLoading(false);
        return;
      } catch (e: any) {
        toast.error(e.message || '验证码错误');
        setLoading(false);
        return;
      }
    }

    const { error } = await signInWithPhone(phoneStr, values.password);
    setLoading(false);
    if (error) {
      toast.error('登录失败', { description: '手机号或密码错误，请重试' });
    } else {
      toast.success('登录成功，欢迎回来！');
      navigate(from === '/login' ? '/' : from, { replace: true });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 手机号 */}
        <FormField
          control={form.control}
          name="phone"
          rules={{ required: '请输入手机号', pattern: { value: /^\d{5,15}$/, message: '请输入有效的手机号码' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-normal">{t('phone_label')}</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[120px] h-11"><SelectValue placeholder="区号" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder={t('phone_placeholder')} className="pl-10 h-11" {...field} />
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 验证码 / 密码 */}
        {loginMethod === 'code' ? (
          <FormField
            control={form.control}
            name="code"
            rules={{ required: '请输入验证码' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-normal">短信验证码</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="输入6位验证码" className="pl-10 h-11" maxLength={6} {...field} />
                    </div>
                    <CountdownButton variant="outline" className="w-[110px] h-11 shrink-0" onClick={handleSendCode} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="password"
            rules={{ required: '请输入密码', minLength: { value: 6, message: '密码至少6位' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-normal">{t('password_label')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder={t('password_placeholder')}
                      className="pl-10 pr-10 h-11"
                      {...field}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end">
          <span className="text-xs text-primary hover:underline cursor-pointer"
            onClick={() => setLoginMethod(m => m === 'password' ? 'code' : 'password')}>
            {loginMethod === 'password' ? '验证码登录' : '密码登录'}
          </span>
        </div>

        <Button type="submit" className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90" disabled={loading}>
          {loading ? '...' : t('btn_login')}
        </Button>
      </form>
    </Form>
  );
}

// ─────────────────────────────────────────────────────────────────
//  忘记密码 Dialog（邮箱 OTP 验证 → 设置新密码）
// ─────────────────────────────────────────────────────────────────
type ResetStep = 'email' | 'verify' | 'newpwd' | 'done';

interface ResetForm {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

function ForgotPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { sendEmailOtp, verifyEmailOtp } = useAuth();
  const [step, setStep] = useState<ResetStep>('email');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ResetForm>({
    defaultValues: { email: '', code: '', newPassword: '', confirmPassword: '' },
  });

  // 重置弹窗状态
  const handleClose = (v: boolean) => {
    if (!v) { form.reset(); setStep('email'); setLoading(false); }
    onOpenChange(v);
  };

  const handleSendCode = async () => {
    const email = form.getValues('email').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的邮箱地址');
      return false;
    }
    const { error } = await sendEmailOtp(email);
    if (error) { toast.error('验证码发送失败', { description: error.message }); return false; }
    toast.success('验证码已发送，请查收邮件');
    setStep('verify');
    return true;
  };

  const handleVerifyCode = async () => {
    const { email, code } = form.getValues();
    if (!code || code.length < 6) { form.setError('code', { message: '请输入6位验证码' }); return; }
    setLoading(true);
    const { error } = await verifyEmailOtp(email.trim(), code.trim());
    setLoading(false);
    if (error) {
      toast.error('验证码错误或已过期，请重新获取');
      return;
    }
    setStep('newpwd');
  };

  const handleSetPassword = async () => {
    const { newPassword, confirmPassword } = form.getValues();
    if (newPassword.length < 6) { form.setError('newPassword', { message: '密码至少6位' }); return; }
    if (newPassword !== confirmPassword) { form.setError('confirmPassword', { message: '两次密码不一致' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error('密码重置失败', { description: error.message }); return; }
    setStep('done');
    toast.success('密码已重置成功，请使用新密码登录');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            重置密码
          </DialogTitle>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-1 mb-2">
          {(['email', 'verify', 'newpwd', 'done'] as ResetStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                step === s ? 'bg-primary text-primary-foreground' :
                  (['email', 'verify', 'newpwd', 'done'].indexOf(step) > i)
                    ? 'bg-primary/30 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {(['email', 'verify', 'newpwd', 'done'].indexOf(step) > i)
                  ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < 3 && <div className={cn('flex-1 h-0.5', (['email', 'verify', 'newpwd', 'done'].indexOf(step) > i) ? 'bg-primary/40' : 'bg-muted')} />}
            </div>
          ))}
        </div>

        <Form {...form}>
          <div className="space-y-4">
            {/* Step 1: 输入邮箱 */}
            {step === 'email' && (
              <>
                <p className="text-sm text-muted-foreground">输入注册时使用的邮箱，我们将发送验证码</p>
                <FormField
                  control={form.control}
                  name="email"
                  rules={{ required: '请输入邮箱', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">邮箱地址</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="请输入邮箱地址" className="pl-10 h-11" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <CountdownButton className="w-full h-11" defaultText="发送验证码" onClick={handleSendCode} />
              </>
            )}

            {/* Step 2: 输入验证码 */}
            {step === 'verify' && (
              <>
                <p className="text-sm text-muted-foreground">
                  验证码已发至 <span className="text-foreground font-medium">{form.getValues('email')}</span>，有效期 10 分钟
                </p>
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">邮箱验证码</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="输入6位验证码" className="pl-10 h-11" maxLength={6} inputMode="numeric" {...field} />
                          </div>
                          <CountdownButton variant="outline" className="w-[100px] h-11 shrink-0" onClick={handleSendCode} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90" disabled={loading} onClick={handleVerifyCode}>
                  {loading ? '验证中...' : '验证并继续'}
                </Button>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground w-full text-center" onClick={() => setStep('email')}>
                  ← 修改邮箱
                </button>
              </>
            )}

            {/* Step 3: 设置新密码 */}
            {step === 'newpwd' && (
              <>
                <p className="text-sm text-muted-foreground">验证成功！请设置新密码（至少6位）</p>
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">新密码</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showPwd ? 'text' : 'password'} placeholder="请输入新密码" className="pl-10 pr-10 h-11" {...field} />
                          <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">确认新密码</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type={showPwd ? 'text' : 'password'} placeholder="再次输入新密码" className="pl-10 h-11" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90" disabled={loading} onClick={handleSetPassword}>
                  {loading ? '保存中...' : '确认重置密码'}
                </Button>
              </>
            )}

            {/* Step 4: 完成 */}
            {step === 'done' && (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <p className="font-semibold text-lg">密码重置成功！</p>
                <p className="text-sm text-muted-foreground">请使用新密码重新登录</p>
                <Button className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90" onClick={() => handleClose(false)}>
                  去登录
                </Button>
              </div>
            )}
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────
//  邮箱登录子表单（支持密码登录 / OTP验证码登录 切换）
// ─────────────────────────────────────────────────────────────────
function EmailLoginForm({ from }: { from: string }) {
  const { sendEmailOtp, verifyEmailOtp, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');
  const [forgotOpen, setForgotOpen] = useState(false);

  const form = useForm<EmailLoginForm>({ defaultValues: { email: '', code: '', password: '' } });

  const handleSendCode = async () => {
    const email = form.getValues('email').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('请输入有效的邮箱地址');
      return false;
    }
    const { error } = await sendEmailOtp(email);
    if (error) {
      toast.error('验证码发送失败', { description: error.message });
      return false;
    }
    toast.success('验证码已发送，请查收邮件');
    return true;
  };

  const onSubmit = async (values: EmailLoginForm) => {
    setLoading(true);
    const email = values.email.trim();

    if (loginMethod === 'password') {
      // 邮箱 + 密码登录
      const { error } = await signInWithEmail(email, values.password);
      setLoading(false);
      if (error) {
        toast.error('登录失败', { description: '邮箱或密码错误，请重试' });
      } else {
        toast.success('登录成功，欢迎回来！');
        navigate(from === '/login' ? '/' : from, { replace: true });
      }
    } else {
      // 邮箱 + OTP 验证码登录
      const { error } = await verifyEmailOtp(email, values.code.trim());
      setLoading(false);
      if (error) {
        toast.error('登录失败', { description: '验证码错误或已过期，请重新获取' });
      } else {
        toast.success('登录成功，欢迎回来！');
        navigate(from === '/login' ? '/' : from, { replace: true });
      }
    }
  };

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 邮箱输入 */}
        <FormField
          control={form.control}
          name="email"
          rules={{
            required: '请输入邮箱地址',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入有效的邮箱地址' },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-normal">邮箱地址</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="请输入邮箱地址" className="pl-10 h-11" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 密码 / 验证码（根据 loginMethod 切换） */}
        {loginMethod === 'password' ? (
          <FormField
            control={form.control}
            name="password"
            rules={{ required: '请输入密码', minLength: { value: 6, message: '密码至少6位' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-normal">密码</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="请输入密码"
                      className="pl-10 pr-10 h-11"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="code"
            rules={{ required: '请输入验证码', minLength: { value: 6, message: '验证码为6位数字' } }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-normal">邮箱验证码</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="输入6位验证码" className="pl-10 h-11" maxLength={6} inputMode="numeric" {...field} />
                    </div>
                    <CountdownButton variant="outline" className="w-[110px] h-11 shrink-0" onClick={handleSendCode} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 切换登录方式 */}
        <div className="flex justify-end">
          <span
            className="text-xs text-primary hover:underline cursor-pointer"
            onClick={() => {
              setLoginMethod(m => m === 'password' ? 'code' : 'password');
              form.clearErrors();
            }}
          >
            {loginMethod === 'password' ? '验证码登录' : '密码登录'}
          </span>
        </div>

        {loginMethod === 'code' && (
          <p className="text-xs text-muted-foreground -mt-2">验证码有效期 10 分钟，请查收邮件（含垃圾箱）</p>
        )}

        {/* 忘记密码链接（仅密码登录模式显示） */}
        {loginMethod === 'password' && (
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setForgotOpen(true)}
            >
              忘记密码？
            </button>
          </div>
        )}

        <Button type="submit" className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </Button>
      </form>
    </Form>

    {/* 忘记密码弹窗 */}
    <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
  </>
  );
}

// ─────────────────────────────────────────────────────────────────
//  页面主体
// ─────────────────────────────────────────────────────────────────
type LoginTab = 'phone' | 'email';

export default function LoginPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const [tab, setTab] = useState<LoginTab>('phone');
  const from = (location.state as { from?: string })?.from || '/';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 hero-bg" />
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link to="/" className="inline-block mb-3">
            <span className="text-[28px] font-bold gradient-text tracking-tight leading-none">AI筑梦呈剧</span>
          </Link>
          <p className="text-muted-foreground text-sm">AI漫剧制作聚合平台</p>
        </div>

        <Card className="border-border/60 glass-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{t('login_title')}</CardTitle>
            <CardDescription>{t('login_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 登录方式 Tab */}
            <div className="flex rounded-lg border border-border p-1 mb-6 gap-1">
              {([
                { key: 'phone', icon: Phone, label: '手机号登录' },
                { key: 'email', icon: Mail,  label: '邮箱登录' },
              ] as { key: LoginTab; icon: any; label: string }[]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-medium transition-colors',
                    tab === key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'phone' ? <PhoneLoginForm from={from} /> : <EmailLoginForm from={from} />}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {t('no_account')}{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                {t('register_now')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

