import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, User, Globe, Lock, Loader2, Trash2, RefreshCw } from 'lucide-react';

interface Character {
  id: string;
  user_id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  tags: string[];
  is_public: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function AdminCharactersPage() {
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [downTarget, setDownTarget] = useState<Character | null>(null);
  const [downing, setDowning] = useState(false);

  const [stats, setStats] = useState({ total: 0, public: 0 });

  // 加载统计
  const loadStats = useCallback(async () => {
    const { count: totalCount } = await supabase
      .from('characters').select('*', { count: 'exact', head: true });
    const { count: pubCount } = await supabase
      .from('characters').select('*', { count: 'exact', head: true }).eq('is_public', true);
    setStats({ total: totalCount ?? 0, public: pubCount ?? 0 });
  }, []);

  // 加载公开角色列表
  const loadChars = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('characters')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    const { data, count } = await query;
    setChars(Array.isArray(data) ? data : []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadChars(); }, [loadChars]);

  // 下架（设为私有）
  const handleTakeDown = async () => {
    if (!downTarget) return;
    setDowning(true);
    const { error } = await supabase.from('characters')
      .update({ is_public: false, updated_at: new Date().toISOString() })
      .eq('id', downTarget.id);
    setDowning(false);
    if (error) { toast.error('操作失败：' + error.message); return; }
    setChars(prev => prev.filter(c => c.id !== downTarget.id));
    setTotal(prev => prev - 1);
    setStats(prev => ({ ...prev, public: prev.public - 1 }));
    toast.success(`「${downTarget.name}」已下架`);
    setDownTarget(null);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">角色库管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">查看和管理用户公开的角色，下架违规内容</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 self-start"
          onClick={() => { loadChars(); loadStats(); }}>
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      {/* 统计 */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: '全部角色', value: stats.total, color: 'text-primary' },
          { label: '公开角色', value: stats.public, color: 'text-green-400' },
          { label: '私有角色', value: stats.total - stats.public, color: 'text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="flex-1 min-w-[110px]">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="搜索角色名称…" className="pl-9 px-3 h-9" />
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : chars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Globe className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {search ? `未找到包含「${search}」的公开角色` : '暂无公开角色'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chars.map(char => (
            <Card key={char.id} className="overflow-hidden h-full flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1 gap-3">
                {/* 角色头部 */}
                <div className="flex gap-3 items-start">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/50">
                    {char.avatar_url
                      ? <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                      : <User className="w-6 h-6 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{char.name}</span>
                      <Badge className="text-[10px] h-4 px-1.5 bg-green-500/15 text-green-400 border-green-500/20 rounded-full gap-0.5 shrink-0">
                        <Globe className="w-2.5 h-2.5" />公开
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(char.created_at).toLocaleDateString('zh-CN')}
                    </p>
                    {char.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {char.tags.slice(0, 4).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full bg-primary/10 text-primary border-primary/15">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 描述 */}
                <p className="text-xs text-muted-foreground line-clamp-3 flex-1 text-pretty">
                  {char.description || '暂无描述'}
                </p>

                {/* 下架按钮 */}
                <div className="pt-1 border-t border-border/40">
                  <Button
                    variant="outline" size="sm"
                    className="w-full h-7 text-xs gap-1.5 text-amber-500 hover:text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => setDownTarget(char)}
                  >
                    <Lock className="w-3 h-3" />
                    下架（设为私有）
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}

      {/* 下架确认 */}
      <AlertDialog open={!!downTarget} onOpenChange={o => { if (!o) setDownTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>确认下架角色</AlertDialogTitle>
            <AlertDialogDescription>
              将角色「{downTarget?.name}」设为私有，该角色将从公共角色库中移除，用户已收藏的副本不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={downing}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleTakeDown} disabled={downing}
              className="bg-amber-500 text-white hover:bg-amber-600 gap-1.5">
              {downing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              {downing ? '处理中…' : '确认下架'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
