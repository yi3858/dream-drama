import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sparkles, Eye, EyeOff, User, Lock, CheckCircle2, Link2 } from 'lucide-react';

interface RegisterForm {
  username: string;
  password: string;
  confirm: string;
  agreed: boolean;
}

const benefits = ['免费体验积分', 'AI漫剧生成权限', '作品云端保存', '专属推广链接'];

export default function RegisterPage() {
  const { signUpWithUsername } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') ?? '';
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterForm>({
    defaultValues: { username: '', password: '', confirm: '', agreed: false },
  });

  const onSubmit = async (values: RegisterForm) => {
    if (!values.agreed) {
      toast.error('请先阅读并同意用户协议与隐私政策');
      return;
    }
    if (values.password !== values.confirm) {
      form.setError('confirm', { message: '两次输入的密码不一致' });
      return;
    }
    setLoading(true);
    const { error } = await signUpWithUsername(values.username, values.password, refCode || undefined);
    setLoading(false);
    if (error) {
      if (error.message.includes('already')) {
        toast.error('注册失败', { description: '该用户名已被使用，请换一个试试' });
      } else {
        toast.error('注册失败', { description: error.message });
      }
    } else {
      toast.success('注册成功！欢迎加入筑梦呈剧');
      navigate('/', { replace: true });
    }
  };

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
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary-bg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 60%, #06b6d4 100%)',
                  boxShadow: '0 0 10px hsl(var(--primary)/0.5)',
                }}>
                <div className="absolute inset-0 opacity-30"
                  style={{ background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.6) 0%, transparent 60%)' }} />
                <span className="relative z-10 text-white font-black text-[11px] tracking-tighter leading-none">AI</span>
                <div className="absolute bottom-1 right-1 w-0.5 h-0.5 rounded-full bg-white/70" />
              </div>
                <span className="text-2xl font-bold gradient-text">筑梦呈剧</span>
              </div>
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
            <div className="text-center mb-6 md:hidden">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary-bg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 60%, #06b6d4 100%)',
                  boxShadow: '0 0 10px hsl(var(--primary)/0.5)',
                }}>
                <div className="absolute inset-0 opacity-30"
                  style={{ background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.6) 0%, transparent 60%)' }} />
                <span className="relative z-10 text-white font-black text-[11px] tracking-tighter leading-none">AI</span>
                <div className="absolute bottom-1 right-1 w-0.5 h-0.5 rounded-full bg-white/70" />
              </div>
                  <span className="text-xl font-bold gradient-text">筑梦呈剧</span>
                </div>
              </Link>
            </div>
            <Card className="border-border/60 glass-card">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">创建账号</CardTitle>
                <CardDescription>只需几秒，开启你的漫剧创作之旅</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      rules={{
                        required: '请输入用户名',
                        minLength: { value: 3, message: '用户名至少3位' },
                        maxLength: { value: 20, message: '用户名最多20位' },
                        pattern: { value: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-normal">用户名</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input placeholder="3-20位字母、数字或下划线" className="pl-10 h-11" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                                placeholder="至少6位密码"
                                className="pl-10 pr-10 h-11"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
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
                    <FormField
                      control={form.control}
                      name="confirm"
                      rules={{ required: '请确认密码' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-normal">确认密码</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type={showPwd ? 'text' : 'password'}
                                placeholder="再次输入密码"
                                className="pl-10 h-11"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* 推广码提示 */}
                    {refCode && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                        <Link2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-primary">通过推广链接注册，将永久绑定推广关系</span>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="agreed"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-start gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-0.5"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal leading-snug text-muted-foreground cursor-pointer">
                              我已阅读并同意{' '}
                              <Link to="/terms" className="text-primary hover:underline">用户协议</Link>
                              {' '}与{' '}
                              <Link to="/privacy" className="text-primary hover:underline">隐私政策</Link>
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90"
                      disabled={loading}
                    >
                      {loading ? '注册中...' : '立即注册'}
                    </Button>
                  </form>
                </Form>
                <div className="mt-5 text-center text-sm text-muted-foreground">
                  已有账号？{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    直接登录
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
