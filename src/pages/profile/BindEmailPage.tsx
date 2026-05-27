import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CountdownButton } from '@/components/ui/countdown-button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Mail, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

interface BindForm {
  email: string;
  code: string;
}

type BindStep = 'input' | 'verify' | 'done';

export default function BindEmailPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<BindStep>('input');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const form = useForm<BindForm>({
    defaultValues: { email: '', code: '' },
  });

  const boundEmail = profile?.email;
  const isReplacing = !!boundEmail;

  // 发送验证码
  const handleSendCode = async (): Promise<boolean> => {
    const email = form.getValues('email').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.setError('email', { message: '请输入有效的邮箱地址' });
      return false;
    }

    // 检查邮箱是否已被其他用户使用
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing && existing.id !== user?.id) {
      form.setError('email', { message: '该邮箱已被其他账号绑定，请更换邮箱' });
      return false;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      // 若用户不存在则允许新邮箱绑定（shouldCreateUser=false 时某些版本会报错）
      // 退回直接发送验证码流程
      const { error: e2 } = await supabase.auth.signInWithOtp({ email });
      if (e2) {
        toast.error('验证码发送失败', { description: e2.message });
        return false;
      }
    }

    setPendingEmail(email);
    setStep('verify');
    toast.success('验证码已发送至邮箱，请查收');
    return true;
  };

  // 验证码 → 绑定邮箱
  const handleVerify = async () => {
    const code = form.getValues('code').trim();
    if (!code || code.length < 6) {
      form.setError('code', { message: '请输入6位验证码' });
      return;
    }

    setLoading(true);
    try {
      // 用 OTP 验证（type=email 表示邮件链接/OTP 验证）
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'email',
      });

      if (verifyErr) {
        toast.error('验证码错误或已过期，请重新获取');
        setLoading(false);
        return;
      }

      // 更新 profiles 表中的 email 字段
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ email: pendingEmail })
        .eq('id', user!.id);

      if (updateErr) {
        toast.error('邮箱绑定失败', { description: updateErr.message });
        setLoading(false);
        return;
      }

      await refreshProfile();
      setStep('done');
      toast.success('邮箱绑定成功！');
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = () => {
    form.reset();
    setStep('input');
    setPendingEmail('');
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-balance">绑定邮箱</h2>
        <p className="text-sm text-muted-foreground mt-1">
          绑定邮箱后可使用邮箱+密码或邮箱+验证码方式登录
        </p>
      </div>

      {/* 当前绑定状态 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            邮箱绑定状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {boundEmail && step !== 'input' ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-sm font-medium truncate">{step === 'done' ? pendingEmail : boundEmail}</span>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">已绑定</Badge>
              </div>
              {step === 'done' && (
                <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={handleReplace}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> 更换邮箱
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>暂未绑定邮箱</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 绑定/更换表单 */}
      {step !== 'done' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isReplacing ? '更换绑定邮箱' : '绑定新邮箱'}
            </CardTitle>
            <CardDescription>
              {step === 'input'
                ? '输入邮箱地址，点击发送验证码完成验证'
                : `验证码已发至 ${pendingEmail}，有效期 10 分钟`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-4">
                {/* 邮箱输入 */}
                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    required: '请输入邮箱地址',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">邮箱地址</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="请输入邮箱地址"
                            className="pl-10 h-11"
                            disabled={step === 'verify'}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 验证码 */}
                {step === 'verify' && (
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
                              <Input
                                placeholder="输入6位验证码"
                                className="pl-10 h-11"
                                maxLength={6}
                                inputMode="numeric"
                                {...field}
                              />
                            </div>
                            <CountdownButton
                              variant="outline"
                              className="w-[100px] h-11 shrink-0"
                              defaultText="重新发送"
                              onClick={handleSendCode}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* 操作按钮 */}
                {step === 'input' && (
                  <CountdownButton
                    className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90"
                    defaultText={isReplacing ? '发送验证码（更换邮箱）' : '发送验证码'}
                    onClick={handleSendCode}
                  />
                )}

                {step === 'verify' && (
                  <div className="space-y-2">
                    <Button
                      className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90"
                      disabled={loading}
                      onClick={handleVerify}
                    >
                      {loading ? '验证中...' : '确认绑定'}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full h-9 text-muted-foreground"
                      onClick={() => { setStep('input'); form.setValue('code', ''); }}
                    >
                      ← 修改邮箱
                    </Button>
                  </div>
                )}
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* 绑定成功提示 */}
      {step === 'done' && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-semibold">邮箱绑定成功！</p>
            <p className="text-sm text-muted-foreground">
              现在可以使用 <span className="text-foreground font-medium">{pendingEmail}</span> 配合密码或验证码登录
            </p>
            <Button variant="outline" className="mt-1 h-9" onClick={handleReplace}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 更换邮箱
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
