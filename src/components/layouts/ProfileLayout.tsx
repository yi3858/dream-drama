import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import {
  User, Wallet, ShoppingBag, Layers, Headphones, Share2, ChevronRight, ScrollText, Mail, Bell, Crown, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

function buildProfileNav(agentLevel?: string) {
  const isAgent = agentLevel === 'agent1' || agentLevel === 'agent2';
  const nav = [
    { label: '账户概览', href: '/profile',               icon: User,      exact: true },
    { label: '我的消息', href: '/profile/notifications',  icon: Bell },
    { label: '我的钱包', href: '/profile/wallet',          icon: Wallet },
    { label: '邀请中心', href: '/profile/invite',          icon: User },
    { label: '积分明细', href: '/profile/credits',         icon: ScrollText },
    { label: '绑定邮箱', href: '/profile/bind-email',      icon: Mail },
    { label: '订单管理', href: '/profile/orders',          icon: ShoppingBag },
    { label: '作品管理', href: '/profile/works',              icon: Layers },
    { label: '生成记录', href: '/profile/generation-records', icon: History },
    { label: '推广后台', href: '/profile/promote',         icon: Share2 },
    { label: '客服帮助', href: '/profile/support',         icon: Headphones },
  ];
  if (isAgent) {
    nav.splice(9, 0, { label: '代理中心', href: '/profile/agent', icon: Crown });
  } else {
    nav.splice(9, 0, { label: '成为代理', href: '/profile/agent', icon: Crown });
  }
  return nav;
}

export default function ProfileLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const profileNav = buildProfileNav(profile?.agent_level ?? undefined);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [user, loading, navigate]);

  // 拉取未读消息数
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    // 实时监听新消息
    const channel = supabase
      .channel('profile-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnreadCount(c => c + 1))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 侧边导航 */}
            <aside className="w-full md:w-56 shrink-0">
              <nav className="bg-card rounded-xl border border-border overflow-hidden">
                {profileNav.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.exact}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-border last:border-b-0',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )
                    }
                  >
                    <item.icon className={cn(
                      'w-4 h-4 shrink-0',
                      item.href === '/profile/agent' ? 'text-amber-400' : ''
                    )} />
                    <span className={cn(
                      'flex-1',
                      item.href === '/profile/agent' ? 'text-amber-400 font-medium' : ''
                    )}>{item.label}</span>
                    {/* 消息未读红点 */}
                    {item.href === '/profile/notifications' && unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {(item.href !== '/profile/notifications' || unreadCount === 0) && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </NavLink>
                ))}
              </nav>
            </aside>
            {/* 内容区 */}
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
