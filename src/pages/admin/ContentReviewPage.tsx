import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Shield, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface WorkRow {
  id: string;
  title: string;
  type: string;
  status: string;
  review_status: string | null;
  created_at: string;
  profiles?: { username: string } | null;
}

const REVIEW_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: '待审核', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved: { label: '已通过', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  rejected: { label: '已驳回', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const TYPE_LABELS: Record<string, string> = {
  novel_to_comic: '小说转漫剧',
  video_to_anime: '短剧转动漫',
};

export default function AdminContentReviewPage() {
  const [works, setWorks] = useState<WorkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchWorks = async () => {
    setLoading(true);
    let query = supabase
      .from('works')
      .select('id, title, type, status, review_status, created_at, profiles!user_id(username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filter !== 'all') query = query.eq('review_status', filter);

    const { data, count } = await query;
    setWorks((data ?? []) as unknown as WorkRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchWorks(); }, [page, filter]);

  const updateReview = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('works').update({ review_status: status }).eq('id', id);
    if (error) { toast.error('操作失败'); return; }
    toast.success(status === 'approved' ? '已通过审核' : '已驳回内容');
    fetchWorks();
  };

  const stats = {
    pending: works.filter(w => w.review_status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> 内容审核
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI生成内容合规审查 · 共 {total} 条</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWorks} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      {/* 快捷统计 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '待审核', icon: Clock, color: 'text-amber-400', badge: stats.pending },
          { label: '今日通过', icon: CheckCircle2, color: 'text-green-400', badge: null },
          { label: '今日驳回', icon: XCircle, color: 'text-destructive', badge: null },
        ].map(({ label, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">—</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={v => { setFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="rejected">已驳回</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 内容列表 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">作品审核列表</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  {['作品标题', '创作者', '类型', '状态', '审核状态', '创建时间', '操作'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">加载中...</td></tr>
                ) : works.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">暂无待审核内容</td></tr>
                ) : works.map(w => {
                  const rs = REVIEW_STATUS[w.review_status ?? 'pending'];
                  return (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap max-w-[200px] truncate">{w.title}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {(w.profiles as { username?: string } | null)?.username ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {TYPE_LABELS[w.type] ?? w.type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">{w.status}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`text-xs border ${rs.cls}`}>{rs.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(w.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {w.review_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 gap-1"
                              variant="outline"
                              onClick={() => updateReview(w.id, 'approved')}
                            >
                              <CheckCircle2 className="w-3 h-3" /> 通过
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                              onClick={() => updateReview(w.id, 'rejected')}
                            >
                              <XCircle className="w-3 h-3" /> 驳回
                            </Button>
                          </div>
                        )}
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
