import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, ShoppingBag, Settings, Shield, Layers, BarChart3,
  Menu, LogOut, ChevronRight, Sparkles, Palette, BookUser, DollarSign, Coins, TrendingUp, PlugZap
} from 'lucide-react';

const NAV_ITEMS = [
  { label: '用户管理', href: '/admin/users', icon: Users },
  { label: '积分管理', href: '/admin/credits', icon: Coins },
  { label: '充值统计', href: '/admin/analytics', icon: TrendingUp },
  { label: '订单财务', href: '/admin/orders', icon: ShoppingBag },
  { label: '内容审核', href: '/admin/review', icon: Shield },
  { label: '代理设置', href: '/admin/agents', icon: BarChart3 },
  { label: '作品管理', href: '/admin/works', icon: Layers },
  { label: '推广积分', href: '/admin/points', icon: Sparkles },
  { label: '邀请记录', href: '/admin/invites', icon: Users },
  { label: '画风配置', href: '/admin/styles', icon: Palette },
  { label: '角色库管理', href: '/admin/characters', icon: BookUser },
  { label: '定价成本', href: '/admin/pricing',  icon: DollarSign },
  { label: '渠道管理', href: '/admin/channels', icon: PlugZap },
  { label: '系统配置', href: '/admin/config', icon: Settings },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* 头部 */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary-bg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">筑梦呈剧</p>
            <p className="text-xs text-sidebar-foreground/60">管理后台</p>
          </div>
        </div>
        {profile && (
          <div className="mt-3 px-2 py-1.5 rounded-md bg-sidebar-accent/50 text-xs text-sidebar-foreground/70">
            {profile.username} · 管理员
          </div>
        )}
      </div>

      {/* 导航 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* 底部操作 */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <Layers className="w-4 h-4" />
          返回前台
        </NavLink>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  // 加载中：渲染与真实布局结构一致的骨架屏，避免黑屏与布局跳变
  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        {/* 侧边栏骨架 */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-sidebar">
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="w-16 h-3 rounded" />
                <Skeleton className="w-12 h-2.5 rounded" />
              </div>
            </div>
            <Skeleton className="mt-3 w-full h-7 rounded-md" />
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-9 rounded-lg" />
            ))}
          </nav>
        </aside>
        {/* 主内容骨架 */}
        <div className="flex-1 min-w-0 p-4 md:p-6 pl-14 lg:pl-6 space-y-6">
          {/* 标题行 */}
          <div className="space-y-2">
            <Skeleton className="w-40 h-6 rounded" />
            <Skeleton className="w-56 h-4 rounded" />
          </div>
          {/* 统计卡片行 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          {/* 快捷入口行 */}
          <div className="space-y-2">
            <Skeleton className="w-20 h-5 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 未登录 → 跳到登录页
  if (!profile) {
    navigate('/login', { replace: true });
    return null;
  }

  // 非管理员 → 跳回首页
  if (profile.role !== 'admin') {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* 桌面侧边栏 */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border">
        <SidebarContent />
      </aside>

      {/* 移动端侧边栏 */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-3 left-3 z-40 h-9 w-9 bg-background/80 backdrop-blur border border-border"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-56 bg-sidebar">
          <SidebarContent onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* 主内容 */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        <div className="flex-1 p-4 md:p-6 pl-14 lg:pl-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
