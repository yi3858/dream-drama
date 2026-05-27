import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CountdownButton } from '@/components/ui/countdown-button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, User, Lock, CheckCircle2, Link2, ShieldCheck, Phone, Mail } from 'lucide-react';
import { Captcha } from '@/components/ui/captcha';
import { LegalDisclaimerDialog, getAgreedState } from '@/components/common/LegalDisclaimerDialog';
import { cn } from '@/lib/utils';

// ── 表单类型 ─────────────────────────────────────────────────────
interface PhoneRegisterForm {
  phone: string;
  code: string;
  password: string;
  confirm: string;
  promoCode: string;
  agreed: boolean;
}
interface EmailRegisterForm {
  email: string;
  code: string;
  password: string;
  confirm: string;
  promoCode: string;
  agreed: boolean;
}

type RegisterTab = 'phone' | 'email';

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

const benefits = ['免费体验积分', 'AI漫剧生成权限', '作品云端保存', '专属推广链接'];

// ─────────────────────────────────────────────────────────────────
//  页面主体
// ─────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { t, language } = useLanguage();
  const { signUpWithPhone, sendEmailOtp, verifyEmailOtp, completeEmailSignUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || searchParams.get('inviteCode') || '';

  const [tab, setTab] = useState<RegisterTab>('phone');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+86');
  const [captchaValid, setCaptchaValid] = useState(false);
  const [phoneSessionId, setPhoneSessionId] = useState('');

  const COUNTRY_CODES = getCountryCodes(t);

  // ── 手机号表单 ────────────────────────────────────────────────
  const phoneForm = useForm<PhoneRegisterForm>({
    defaultValues: { phone: '', code: '', password: '', confirm: '', promoCode: refCode, agreed: getAgreedState() },
  });

  // ── 邮箱表单 ──────────────────────────────────────────────────
  const emailForm = useForm<EmailRegisterForm>({
    defaultValues: { email: '', code: '', password: '', confirm: '', promoCode: refCode, agreed: getAgreedState() },
  });

  // ── 发送短信验证码 ─────────────────────────────────────────────
  const handleSendSmsCode = async () => {
    let phone = phoneForm.getValues('phone');
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
      setPhoneSessionId(data.data.sessionId);
      toast.success('验证码已发送');
      return true;
    } catch (e: any) {
      toast.error(e.message || '发送失败，请稍后再试');
      return false;
    }
  };

  // ── 发送邮箱验证码 ─────────────────────────────────────────────
  const handleSendEmailCode = async () => {
    const email = emailForm.getValues('email').trim();
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

  // ── 手机号注册提交 ─────────────────────────────────────────────
  const onPhoneSubmit = async (values: PhoneRegisterForm) => {
    if (!captchaValid) { toast.error('请先完成图形验证码校验'); return; }
    if (!phoneSessionId) { toast.error('请先获取短信验证码'); return; }
    if (!values.agreed) { toast.error('请先阅读并同意用户协议与隐私政策'); return; }
    if (values.password !== values.confirm) {
      phoneForm.setError('confirm', { message: '两次输入的密码不一致' });
      return;
    }
    setLoading(true);
    let phoneStr = values.phone.trim();
    if (!phoneStr.startsWith('+')) phoneStr = countryCode + phoneStr;
    try {
      const { supabase } = await import('@/db/supabase');
      const { data: vData, error: vError } = await supabase.functions.invoke('verify-sms-code', {
        body: { mobile: phoneStr, code: values.code, sessionId: phoneSessionId },
      });
      if (vError) throw vError;
      if (vData.status !== 0) throw new Error(vData.msg || '验证失败');
    } catch (e: any) {
      toast.error(e.message || '验证码错误');
      setLoading(false);
      return;
    }
    const { error } = await signUpWithPhone(phoneStr, values.password, values.promoCode || undefined);
    setLoading(false);
    if (error) {
      toast.error('注册失败', {
        description: error.message.includes('already') ? '该手机号已被注册，请直接登录' : error.message,
      });
    } else {
      toast.success('注册成功！', { description: '已为您发放30积分新手礼包' });
      navigate('/', { replace: true });
    }
  };

  // ── 邮箱注册提交 ───────────────────────────────────────────────
  const onEmailSubmit = async (values: EmailRegisterForm) => {
    if (!captchaValid) { toast.error('请先完成图形验证码校验'); return; }
    if (!values.agreed) { toast.error('请先阅读并同意用户协议与隐私政策'); return; }
    if (values.password !== values.confirm) {
      emailForm.setError('confirm', { message: '两次输入的密码不一致' });
      return;
    }
    setLoading(true);
    // Step 1: OTP 验证 → 自动登录（账号不存在时自动创建）
    const { error: otpErr } = await verifyEmailOtp(values.email.trim(), values.code.trim());
    if (otpErr) {
      toast.error('验证码错误或已过期，请重新获取', { description: otpErr.message });
      setLoading(false);
      return;
    }
    // Step 2: 设置密码 + 发积分 + 绑推广码
    const { error: signUpErr } = await completeEmailSignUp(
      values.email.trim(),
      values.password,
      values.promoCode || undefined,
    );
    setLoading(false);
    if (signUpErr) {
      toast.error('注册完善失败', { description: signUpErr.message });
    } else {
      toast.success('注册成功！', { description: '已为您发放30积分新手礼包' });
      navigate('/', { replace: true });
    }
  };

  // ── 协议勾选标签（复用） ──────────────────────────────────────
  const AgreementLabel = ({ form: f }: { form: any }) => (
    <FormLabel className="text-sm font-normal leading-snug text-muted-foreground cursor-pointer">
      {t('agree_terms')}{' '}
      <Link to="/terms" className="text-primary hover:underline">{t('user_agreement')}</Link>
      {' '}{language === 'zh' ? '与' : 'and'}{' '}
      <Link to="/privacy" className="text-primary hover:underline">{t('privacy_policy')}</Link>
      {language === 'zh' ? '，并已阅读' : (language === 'en' ? ', and have read the' : ' และได้อ่าน')}
      {' '}
      <LegalDisclaimerDialog
        defaultLang={language as 'zh' | 'en' | 'th'}
        onAgreed={() => f.setValue('agreed', true)}
        trigger={
          <span className="text-primary hover:underline cursor-pointer">
            {language === 'zh' ? '法律与免责声明' : (language === 'en' ? 'Legal Disclaimer' : 'ข้อจำกัดความรับผิดชอบ')}
          </span>
        }
      />
    </FormLabel>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-16">
      <div className="absolute inset-0 hero-bg" />
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[calc(100%-2rem)] md:max-w-4xl px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* 左侧介绍 */}
          <div className="hidden md:block space-y-6">
            <Link to="/" className="inline-block mb-2">
              <span className="text-[28px] font-bold gradient-text tracking-tight leading-none">AI筑梦呈剧</span>
            </Link>
            <h2 className="text-3xl font-bold leading-tight text-balance">
              加入筑梦呈剧<br />
              <span className="gradient-text">开启AI创作新纪元</span>
            </h2>
            <p className="text-muted-foreground text-pretty">
              注册即可获得免费体验积分，立即体验AI漫剧生成的强大能力
            </p>
            <div className="space-y-3">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧表单 */}
          <div>
            <div className="text-center mb-6 md:hidden flex justify-center">
              <Link to="/" className="inline-block">
                <span className="text-[28px] font-bold gradient-text tracking-tight leading-none">AI筑梦呈剧</span>
              </Link>
            </div>
            <Card className="border-border/60 glass-card">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{t('register_title')}</CardTitle>
                <CardDescription>{t('register_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 注册方式 Tab */}
                <div className="flex rounded-lg border border-border p-1 mb-6 gap-1">
                  {([
                    { key: 'phone', icon: Phone, label: '手机号注册' },
                    { key: 'email', icon: Mail,  label: '邮箱注册' },
                  ] as { key: RegisterTab; icon: any; label: string }[]).map(({ key, icon: Icon, label }) => (
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

                {/* ── 手机号注册 ── */}
                {tab === 'phone' && (
                  <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                      <FormField
                        control={phoneForm.control}
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
                      <FormField
                        control={phoneForm.control}
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
                                <CountdownButton variant="outline" className="w-[110px] h-11 shrink-0" onClick={handleSendSmsCode} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={phoneForm.control}
                        name="password"
                        rules={{ required: '请输入密码', minLength: { value: 6, message: '密码至少6位' } }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-normal">{t('password_label')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type={showPwd ? 'text' : 'password'} placeholder={t('password_placeholder')} className="pl-10 pr-10 h-11" {...field} />
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
                      <FormField
                        control={phoneForm.control}
                        name="confirm"
                        rules={{ required: '请确认密码' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-normal">{t('confirm_password')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type={showPwd ? 'text' : 'password'} placeholder={t('confirm_placeholder')} className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={phoneForm.control}
                        name="promoCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-normal">邀请码 (选填)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="输入好友邀请码或推广码" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {refCode && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                          <Link2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-primary">通过推广链接注册，将永久绑定推广关系</span>
                        </div>
                      )}
                      <div className="space-y-2 pt-2">
                        <Label className="text-sm font-normal">安全验证</Label>
                        <Captcha onSuccess={setCaptchaValid} />
                      </div>
                      <FormField
                        control={phoneForm.control}
                        name="agreed"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-start gap-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                              </FormControl>
                              <AgreementLabel form={phoneForm} />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90" disabled={loading || !captchaValid}>
                        {loading ? '...' : (captchaValid ? t('register_now') : '请先完成验证')}
                      </Button>
                    </form>
                  </Form>
                )}

                {/* ── 邮箱注册 ── */}
                {tab === 'email' && (
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                      <FormField
                        control={emailForm.control}
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
                      <FormField
                        control={emailForm.control}
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
                                <CountdownButton variant="outline" className="w-[110px] h-11 shrink-0" onClick={handleSendEmailCode} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-xs text-muted-foreground -mt-2">验证码有效期 10 分钟，请查收邮件（含垃圾箱）</p>
                      <FormField
                        control={emailForm.control}
                        name="password"
                        rules={{ required: '请输入密码', minLength: { value: 6, message: '密码至少6位' } }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-normal">{t('password_label')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type={showPwd ? 'text' : 'password'} placeholder={t('password_placeholder')} className="pl-10 pr-10 h-11" {...field} />
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
                      <FormField
                        control={emailForm.control}
                        name="confirm"
                        rules={{ required: '请确认密码' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-normal">{t('confirm_password')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input type={showPwd ? 'text' : 'password'} placeholder={t('confirm_placeholder')} className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={emailForm.control}
                        name="promoCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-normal">邀请码 (选填)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder="输入好友邀请码或推广码" className="pl-10 h-11" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {refCode && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                          <Link2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-primary">通过推广链接注册，将永久绑定推广关系</span>
                        </div>
                      )}
                      <div className="space-y-2 pt-2">
                        <Label className="text-sm font-normal">安全验证</Label>
                        <Captcha onSuccess={setCaptchaValid} />
                      </div>
                      <FormField
                        control={emailForm.control}
                        name="agreed"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-start gap-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                              </FormControl>
                              <AgreementLabel form={emailForm} />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90" disabled={loading || !captchaValid}>
                        {loading ? '...' : (captchaValid ? t('register_now') : '请先完成验证')}
                      </Button>
                    </form>
                  </Form>
                )}

                <div className="mt-5 text-center text-sm text-muted-foreground">
                  {t('already_have_account')}{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    {t('login_now')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

