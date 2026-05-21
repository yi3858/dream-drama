import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import {
  User, Wallet, ShoppingBag, Layers, Headphones, Share2, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const profileNav = [
  { label: '账户概览', href: '/profile', icon: User, exact: true },
  { label: '积分充值', href: '/profile/recharge', icon: Wallet },
  { label: '订单管理', href: '/profile/orders', icon: ShoppingBag },
  { label: '作品管理', href: '/profile/works', icon: Layers },
  { label: '推广后台', href: '/profile/promote', icon: Share2 },
  { label: '客服帮助', href: '/profile/support', icon: Headphones },
];

export default function ProfileLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [user, loading, navigate]);

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
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40" />
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
