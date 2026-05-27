import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Work } from '@/types';
import { Layers, Download, Trash2, Sparkles, BookOpen, Film, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  pending: { label: '排队中', icon: Clock, class: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  processing: { label: '生成中', icon: Loader2, class: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  completed: { label: '已完成', icon: CheckCircle2, class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  failed: { label: '已失败', icon: XCircle, class: 'bg-destructive/20 text-destructive border-destructive/30' },
};

export default function WorksPage() {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Work | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWorks = async () => {
    if (!user) return;
    const { data } = await supabase.from('works').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setWorks((data as Work[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchWorks(); }, [user]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('works').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error('删除失败'); return; }
    toast.success('作品已删除');
    setDeleteTarget(null);
    fetchWorks();
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> 作品管理
            <Badge variant="secondary" className="ml-auto text-xs">{works.length} 件作品</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : works.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">还没有作品，快去创作吧！</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button size="sm" asChild><a href="/novel-to-comic">小说转漫剧</a></Button>
                <Button size="sm" variant="outline" asChild><a href="/video-to-anime">短剧转动漫</a></Button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {works.map(work => {
                const st = STATUS_MAP[work.status] ?? STATUS_MAP.pending;
                const StatusIcon = st.icon;
                return (
                  <div key={work.id} className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors h-full flex flex-col">
                    {/* 缩略图 */}
                    <div className="aspect-video bg-muted relative shrink-0">
                      {work.thumbnail_url && !work.thumbnail_url.startsWith('placeholder') ? (
                        <img src={work.thumbnail_url} alt={work.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-cyan-500/15">
                          {work.type === 'novel_to_comic'
                            ? <BookOpen className="w-10 h-10 text-primary/40" />
                            : work.type === 'motion_transfer' 
                            ? <Sparkles className="w-10 h-10 text-primary/40" /> 
                            : <Film className="w-10 h-10 text-cyan-400/40" />}
                        </div>
                      )}
                      <Badge variant="outline" className={`absolute top-2 left-2 text-[10px] border ${st.class} gap-1`}>
                        <StatusIcon className={`w-3 h-3 ${work.status === 'processing' ? 'animate-spin' : ''}`} />
                        {st.label}
                      </Badge>
                    </div>

                    {/* 内容 */}
                    <div className="p-3 flex flex-col flex-1">
                      <h4 className="font-medium text-sm truncate mb-1">{work.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {work.type === 'novel_to_comic' ? '小说转漫剧' : work.type === 'motion_transfer' ? '动作迁移' : '短剧转动漫'}
                        </Badge>
                        <span>{new Date(work.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        {work.status === 'completed' && work.result_url && (
                          <Button size="sm" className="flex-1 gap-1.5 gradient-primary-bg border-0 text-white hover:opacity-90 h-8" asChild>
                            <a href={work.result_url} download target="_blank" rel="noreferrer">
                              <Download className="w-3.5 h-3.5" /> 下载
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                          onClick={() => setDeleteTarget(work)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>删除作品</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            确认删除《{deleteTarget?.title}》？删除后无法恢复。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
