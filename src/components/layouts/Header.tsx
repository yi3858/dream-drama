import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  Menu, Sparkles, BookOpen, Film, Star, TrendingUp, BarChart2,
  Crown, Users2, User, Wallet, ShoppingBag, Layers, Headphones,
  Share2, LogOut, ChevronDown, Zap, Shield, X, ArrowRight, BookUser, Megaphone,
  ImageIcon, Video,
} from 'lucide-react';

const navItems = [
  {
    label: '创作中心', icon: Star, children: [
      { label: '作品案例', href: '/showcase', icon: Layers },
      { label: '创作热点', href: '/trending', icon: TrendingUp },
      { label: '爆款分析', href: '/analysis', icon: BarChart2 },
    ]
  },
  { label: '角色库', href: '/characters', icon: BookUser },
  { label: '会员充值', href: '/pricing', icon: Crown },
  { label: '代理招商', href: '/agent', icon: Users2 },
];

// 移动端菜单中展开的子项分组
const mobileNavFlat = [
  { label: '小说转漫剧', href: '/novel-to-comic', icon: BookOpen, badge: null },
  { label: '短剧转动漫', href: '/video-to-anime', icon: Film, badge: null },
  { label: '广告制作', href: '/ad-maker', icon: Megaphone, badge: 'NEW' },
  { label: '文生图', href: '/text-to-image', icon: ImageIcon, badge: 'NEW' },
  { label: '图生视频', href: '/image-to-video', icon: Video, badge: 'NEW' },
  { label: '作品案例', href: '/showcase', icon: Layers, badge: null },
  { label: '创作热点', href: '/trending', icon: TrendingUp, badge: null },
  { label: '爆款分析', href: '/analysis', icon: BarChart2, badge: null },
  { label: '角色库', href: '/characters', icon: BookUser, badge: null },
  { label: '会员充值', href: '/pricing', icon: Crown, badge: 'HOT' },
  { label: '代理招商', href: '/agent', icon: Users2, badge: null },
];

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // 路由切换关闭菜单
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_24px_0_hsl(var(--background)/0.8)]'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <span className="text-[28px] font-bold gradient-text leading-none">AI筑梦呈剧</span>
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) =>
              item.children ? (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`text-sm px-3 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/8 gap-1 ${
                        item.children.some(c => isActive(c.href)) ? 'text-primary bg-primary/10' : ''
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40 bg-popover/95 backdrop-blur-xl border-border/60">
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.href} asChild>
                        <Link
                          to={child.href}
                          className={`flex items-center gap-2 ${isActive(child.href) ? 'text-primary' : ''}`}
                        >
                          <child.icon className="w-4 h-4" />
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  key={item.href}
                  variant="ghost"
                  asChild
                  className={`text-sm px-3 h-9 rounded-full gap-1.5 ${
                    isActive(item.href!)
                      ? 'text-primary bg-primary/12 hover:bg-primary/16'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/8'
                  }`}
                >
                  <Link to={item.href!}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {item.href === '/pricing' && (
                      <Badge className="ml-1 text-[10px] h-4 px-1 gradient-primary-bg border-0">HOT</Badge>
                    )}
                  </Link>
                </Button>
              )
            )}
          </nav>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 数据看板（仅登录用户·桌面） */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden md:flex text-muted-foreground hover:text-foreground"
              >
                <Link to="/dashboard">
                  <BarChart2 className="w-4 h-4" />
                  <span className="sr-only md:not-sr-only ml-1.5">数据看板</span>
                </Link>
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden md:flex items-center gap-2 px-2 h-9">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs gradient-primary-bg text-white">
                        {profile?.username?.[0]?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium leading-none">
                        {profile?.username ?? '用户'}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <Zap className="w-3 h-3 text-warning" />
                        {profile?.credits ?? 0} 积分
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile?.username ?? '用户'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3 text-warning" />
                        剩余积分：{profile?.credits ?? 0}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <User className="w-4 h-4" /> 个人中心
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/recharge" className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> 充值积分
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/orders" className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" /> 订单管理
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/works" className="flex items-center gap-2">
                      <Layers className="w-4 h-4" /> 作品管理
                    </Link>
                  </DropdownMenuItem>
                  {(profile?.agent_level === 'agent1' || profile?.agent_level === 'agent2') && (
                    <DropdownMenuItem asChild>
                      <Link to="/profile/promote" className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> 推广后台
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/profile/support" className="flex items-center gap-2">
                      <Headphones className="w-4 h-4" /> 客服帮助
                    </Link>
                  </DropdownMenuItem>
                  {profile?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 text-primary">
                          <Shield className="w-4 h-4" /> 管理后台
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">登录</Link>
                </Button>
                <Button size="sm" className="gradient-primary-bg border-0 text-white hover:opacity-90 rounded-full" asChild>
                  <Link to="/register">免费注册</Link>
                </Button>
              </div>
            )}

            {/* 移动端汉堡按钮 — 动画切换 Menu/X */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden w-9 h-9 rounded-full hover:bg-white/8 relative"
                  aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
                >
                  {/* Menu 图标 */}
                  <Menu
                    className={`w-5 h-5 absolute transition-all duration-200 ${
                      mobileOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                    }`}
                  />
                  {/* X 图标 */}
                  <X
                    className={`w-5 h-5 absolute transition-all duration-200 ${
                      mobileOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                    }`}
                  />
                </Button>
              </SheetTrigger>

              {/* 移动端全宽抽屉 */}
              <SheetContent
                side="right"
                className="w-full sm:w-[320px] p-0 bg-[hsl(228_32%_7%)] border-l border-border/40 flex flex-col"
              >
                {/* ── 顶部：渐变装饰 + Logo ── */}
                <div className="relative overflow-hidden">
                  {/* 背景渐变装饰 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/18 via-primary/6 to-transparent pointer-events-none" />
                  <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative px-5 pt-5 pb-4">
                    <Link to="/" className="flex items-center gap-2 mb-5" onClick={() => setMobileOpen(false)}>
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 60%, #06b6d4 100%)',
                          boxShadow: '0 0 12px hsl(var(--primary)/0.5)',
                        }}>
                        <div className="absolute inset-0 opacity-30"
                          style={{ background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.6) 0%, transparent 60%)' }} />
                        <span className="relative z-10 text-white font-black text-xs tracking-tighter leading-none">AI</span>
                        <div className="absolute bottom-1 right-1 w-0.5 h-0.5 rounded-full bg-white/70" />
                      </div>
                      <span className="text-lg font-bold gradient-text">筑梦呈剧</span>
                    </Link>

                    {/* 已登录：用户卡片 */}
                    {user ? (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 ring-1 ring-white/8">
                        <Avatar className="w-11 h-11 ring-2 ring-primary/30">
                          <AvatarFallback className="gradient-primary-bg text-white text-base font-bold">
                            {profile?.username?.[0]?.toUpperCase() ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{profile?.username ?? '用户'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Zap className="w-3 h-3 text-warning shrink-0" />
                            {profile?.credits ?? 0} 积分可用
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs text-primary hover:bg-primary/10 rounded-full px-2.5 h-7"
                          asChild
                        >
                          <Link to="/profile/recharge" onClick={() => setMobileOpen(false)}>充值</Link>
                        </Button>
                      </div>
                    ) : (
                      /* 未登录：注册/登录提示 */
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          className="flex-1 border border-white/12 text-foreground hover:bg-white/8 rounded-full h-10"
                          asChild
                        >
                          <Link to="/login" onClick={() => setMobileOpen(false)}>登录</Link>
                        </Button>
                        <Button
                          className="flex-1 gradient-primary-bg border-0 text-white hover:opacity-90 rounded-full h-10 gap-1.5"
                          asChild
                        >
                          <Link to="/register" onClick={() => setMobileOpen(false)}>
                            免费注册 <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 导航列表 ── */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                  <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest px-3 pt-1 pb-2">
                    功能导航
                  </p>
                  {mobileNavFlat.map((item, i) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`animate-nav-item flex items-center gap-3 px-3 min-h-[48px] rounded-xl text-sm transition-all duration-150 group/item ${
                        isActive(item.href)
                          ? 'bg-primary/14 text-primary font-semibold ring-1 ring-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.12)]'
                          : 'text-foreground/80 hover:bg-white/6 hover:text-foreground'
                      }`}
                      style={{ animationDelay: `${i * 35 + 80}ms` }}
                    >
                      {/* 激活左侧指示条 */}
                      <span className={`w-0.5 h-5 rounded-full shrink-0 transition-all duration-200 ${
                        isActive(item.href) ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]' : 'bg-transparent'
                      }`} />
                      <item.icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                        isActive(item.href) ? 'text-primary' : 'text-muted-foreground group-hover/item:text-foreground'
                      }`} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge className="text-[9px] h-4 px-1.5 gradient-primary-bg border-0 shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  ))}

                  {/* 已登录：个人区域 */}
                  {user && (
                    <>
                      <div className="pt-3 pb-1">
                        <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest px-3 pb-1">
                          我的账户
                        </p>
                      </div>
                      {[
                        { label: '个人中心', href: '/profile', icon: User },
                        { label: '作品管理', href: '/profile/works', icon: Layers },
                        { label: '数据看板', href: '/dashboard', icon: BarChart2 },
                        { label: '订单管理', href: '/profile/orders', icon: ShoppingBag },
                      ].map((item, i) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`animate-nav-item flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm transition-all duration-150 ${
                            isActive(item.href)
                              ? 'bg-primary/14 text-primary font-semibold ring-1 ring-primary/20'
                              : 'text-foreground/75 hover:bg-white/6 hover:text-foreground'
                          }`}
                          style={{ animationDelay: `${(mobileNavFlat.length + i) * 35 + 80}ms` }}
                        >
                          <span className={`w-0.5 h-5 rounded-full shrink-0 transition-all duration-200 ${
                            isActive(item.href) ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]' : 'bg-transparent'
                          }`} />
                          <item.icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1">{item.label}</span>
                        </Link>
                      ))}
                      {profile?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm text-primary hover:bg-primary/10 transition-all"
                        >
                          <span className="w-0.5 h-5 rounded-full bg-transparent shrink-0" />
                          <Shield className="w-4 h-4 shrink-0" />
                          管理后台
                        </Link>
                      )}
                    </>
                  )}
                </nav>

                {/* ── 底部：退出 / 未登录占位 ── */}
                <div className="px-4 py-4 border-t border-border/30">
                  {user ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/8 gap-2 rounded-xl h-11"
                      onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </Button>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground/50">
                      登录后解锁全部创作功能
                    </p>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
