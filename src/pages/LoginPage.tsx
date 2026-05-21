import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sparkles, Eye, EyeOff, User, Lock } from 'lucide-react';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { signInWithUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || '/';

  const form = useForm<LoginForm>({ defaultValues: { username: '', password: '' } });

  const onSubmit = async (values: LoginForm) => {
    setLoading(true);
    const { error } = await signInWithUsername(values.username, values.password);
    setLoading(false);
    if (error) {
      toast.error('登录失败', { description: '用户名或密码错误，请重试' });
    } else {
      toast.success('登录成功，欢迎回来！');
      navigate(from === '/login' ? '/' : from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 hero-bg" />
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
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
          <p className="text-muted-foreground mt-2 text-sm">AI漫剧制作聚合平台</p>
        </div>

        <Card className="border-border/60 glass-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">欢迎回来</CardTitle>
            <CardDescription>登录账号，继续你的AI创作之旅</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  rules={{ required: '请输入用户名', pattern: { value: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' } }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">用户名</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="请输入用户名" className="pl-10 h-11" {...field} />
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
                            placeholder="请输入密码"
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
                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary-bg border-0 text-white hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              还没有账号？{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                立即注册
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
