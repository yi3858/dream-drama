import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, CheckCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = items.filter(n => !n.is_read).map(n => n.id);
    if (!unreadIds.length) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
    if (error) { toast.error('操作失败'); return; }
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('已全部标记为已读');
  };

  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> 我的消息
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0
              ? <span className="text-primary font-medium">{unreadCount} 条未读</span>
              : '暂无未读消息'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> 全部已读
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            消息列表
            {unreadCount > 0 && (
              <Badge className="gradient-primary-bg text-white border-0 text-[10px] px-1.5">{unreadCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">加载中...</div>
          ) : items.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
              <BellOff className="w-10 h-10 opacity-30" />
              <p className="text-sm">暂无消息通知</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map(n => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/20 ${
                    !n.is_read ? 'bg-primary/[0.03]' : ''
                  }`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  {/* 图标 */}
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    !n.is_read ? 'bg-primary/15' : 'bg-muted'
                  }`}>
                    <Zap className={`w-4 h-4 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{n.content}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1.5">
                      {new Date(n.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
