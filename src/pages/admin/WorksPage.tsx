import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Layers, RefreshCw, Trash2, Eye } from 'lucide-react';

interface WorkRow {
  id: string;
  title: string;
  type: string;
  status: string;
  review_status: string | null;
  thumbnail_url: string | null;
  created_at: string;
  profiles?: { username: string } | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: '排队中', cls: 'bg-muted text-muted-foreground' },
  processing: { label: '生成中', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed:  { label: '已完成', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  failed:     { label: '生成失败', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function AdminWorksPage() {
  const [works, setWorks] = useState<WorkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchWorks = async () => {
    setLoading(true);
    let query = supabase
      .from('works')
      .select('id, title, type, status, review_status, thumbnail_url, created_at, profiles!user_id(username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, count } = await query;
    setWorks((data ?? []) as unknown as WorkRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchWorks(); }, [page, statusFilter]);

  const deleteWork = async (id: string) => {
    if (!confirm('确认删除该作品？此操作不可撤销。')) return;
    const { error } = await supabase.from('works').delete().eq('id', id);
    if (error) { toast.error('删除失败'); return; }
    toast.success('作品已删除');
    fetchWorks();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> 作品管理
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {total} 部作品</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWorks} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">排队中</SelectItem>
            <SelectItem value="processing">生成中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">生成失败</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">作品列表</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['缩略图', '标题', '创作者', '类型', '状态', '审核', '创建时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">加载中...</td></tr>
                ) : works.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">暂无作品数据</td></tr>
                ) : works.map(w => {
                  const s = STATUS_MAP[w.status] ?? STATUS_MAP.pending;
                  return (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {w.thumbnail_url ? (
                          <img src={w.thumbnail_url} alt={w.title} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[160px] truncate whitespace-nowrap">{w.title}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {(w.profiles as { username?: string } | null)?.username ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {w.type === 'novel_to_comic' ? '小说转漫剧' : '短剧转动漫'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs border ${s.cls}`}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {w.review_status ? (
                          <Badge variant="outline" className="text-xs">{w.review_status}</Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(w.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          {w.thumbnail_url && (
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <a href={w.thumbnail_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-3 h-3" /> 预览
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => deleteWork(w.id)}
                          >
                            <Trash2 className="w-3 h-3" /> 删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">第 {page + 1} 页，共 {Math.ceil(total / PAGE_SIZE) || 1} 页</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>上一页</Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>下一页</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
