import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  ImageIcon, Video, History, Zap, CheckCircle2, Clock, XCircle,
  Loader2, ChevronDown, ZoomIn, Play, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 常量 ─────────────────────────────────────────────────────────────────────
type FeatureTab = 'all' | 'text_to_image' | 'image_to_video';
type StatusFilter = 'all' | 'processing' | 'completed' | 'failed';

const PAGE_SIZE = 12;

const FEATURE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  text_to_image:  { label: '文生图',  icon: ImageIcon },
  image_to_video: { label: '图生视频', icon: Video },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending:    { label: '排队中', icon: Clock,        cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  processing: { label: '生成中', icon: Loader2,      cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  completed:  { label: '已完成', icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  failed:     { label: '已失败', icon: XCircle,      cls: 'bg-destructive/15 text-destructive border-destructive/30' },
};

// ─── 类型 ─────────────────────────────────────────────────────────────────────
interface RecordRow {
  id:              string;
  feature_type:    string;
  status:          string;
  credits_charged: number;
  prompt:          string;
  result_urls:     string[];
  error_msg:       string;
  created_at:      string;
  channel:         { name: string } | null;
}

// ─── 统计卡片 ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, cls = '' }: { label: string; value: number | string; icon: React.ElementType; cls?: string }) {
  return (
    <Card className="h-full">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', cls)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 记录卡片 ─────────────────────────────────────────────────────────────────
function RecordCard({ row, onPreview }: { row: RecordRow; onPreview: (urls: string[], type: string) => void }) {
  const feat    = FEATURE_LABELS[row.feature_type] ?? { label: row.feature_type, icon: History };
  const st      = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.failed;
  const FeatIcon = feat.icon;
  const StIcon   = st.icon;
  const imgs    = row.result_urls ?? [];
  const isVideo = row.feature_type === 'image_to_video';
  const date    = new Date(row.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* 结果预览区 */}
      {imgs.length > 0 ? (
        <div
          className="relative w-full aspect-video bg-muted/30 cursor-pointer group overflow-hidden shrink-0"
          onClick={() => onPreview(imgs, row.feature_type)}
        >
          {isVideo ? (
            <div className="w-full h-full flex items-center justify-center bg-black/60">
              <Play className="w-10 h-10 text-white/80" />
            </div>
          ) : (
            <div className={cn('grid w-full h-full', imgs.length >= 4 ? 'grid-cols-2' : 'grid-cols-1')}>
              {imgs.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {imgs.length > 1 && !isVideo && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
              {imgs.length} 张
            </span>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-muted/20 flex items-center justify-center shrink-0">
          <FeatIcon className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}

      {/* 信息区 */}
      <CardContent className="p-3 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <FeatIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium">{feat.label}</span>
          {row.channel && (
            <span className="text-[10px] text-muted-foreground truncate">· {row.channel.name}</span>
          )}
          <Badge variant="outline" className={cn('ml-auto text-[10px] shrink-0 border', st.cls)}>
            <StIcon className={cn('w-2.5 h-2.5 mr-0.5', row.status === 'processing' && 'animate-spin')} />
            {st.label}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {row.prompt || '（无提示词）'}
        </p>

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-[10px] text-muted-foreground">{date}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
            <Zap className="w-3 h-3" />{row.credits_charged} 积分
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 预览弹窗 ─────────────────────────────────────────────────────────────────
function PreviewDialog({ urls, featureType, onClose }: { urls: string[]; featureType: string; onClose: () => void }) {
  const [cur, setCur] = useState(0);
  const isVideo = featureType === 'image_to_video';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl p-2 bg-black/95 border-border/30">
        {isVideo ? (
          <video
            src={urls[0]}
            controls
            autoPlay
            className="w-full rounded-lg max-h-[75vh] object-contain"
          />
        ) : (
          <div className="space-y-2">
            <img
              src={urls[cur]}
              alt=""
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
            {urls.length > 1 && (
              <div className="flex gap-1.5 justify-center flex-wrap">
                {urls.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCur(i)}
                    className={cn(
                      'w-12 h-12 rounded overflow-hidden border-2 transition-colors',
                      cur === i ? 'border-primary' : 'border-transparent',
                    )}
                  >
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function GenerationRecordsPage() {
  const { user } = useAuth();

  const [featureTab,   setFeatureTab]   = useState<FeatureTab>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [records,      setRecords]      = useState<RecordRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(false);
  const [page,         setPage]         = useState(0);
  const [stats,        setStats]        = useState({ total: 0, success: 0, credits: 0 });
  const [preview,      setPreview]      = useState<{ urls: string[]; type: string } | null>(null);

  const fetchRecords = useCallback(async (pageNum: number, reset: boolean) => {
    if (!user) return;
    if (reset) setLoading(true); else setLoadingMore(true);

    let q = supabase
      .from('generation_tasks')
      .select('id,feature_type,status,credits_charged,prompt,result_urls,error_msg,created_at,channel:model_channels(name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (featureTab !== 'all')      q = q.eq('feature_type', featureTab);
    if (statusFilter !== 'all')    q = q.eq('status', statusFilter);

    const { data, count } = await q;
    const rows = (data ?? []).map((r: {
      id: string; feature_type: string; status: string; credits_charged: number;
      prompt: string; result_urls: string[]; error_msg: string; created_at: string;
      channel: { name: string }[] | { name: string } | null;
    }): RecordRow => ({
      id:              r.id,
      feature_type:    r.feature_type,
      status:          r.status,
      credits_charged: r.credits_charged,
      prompt:          r.prompt,
      result_urls:     r.result_urls ?? [],
      error_msg:       r.error_msg,
      created_at:      r.created_at,
      channel:         Array.isArray(r.channel) ? (r.channel[0] ?? null) : r.channel,
    }));

    if (reset) {
      setRecords(rows);
    } else {
      setRecords(prev => [...prev, ...rows]);
    }
    setHasMore((pageNum + 1) * PAGE_SIZE < (count ?? 0));
    setLoading(false);
    setLoadingMore(false);
  }, [user, featureTab, statusFilter]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('generation_tasks')
      .select('status,credits_charged')
      .eq('user_id', user.id);

    const rows = data ?? [];
    setStats({
      total:   rows.length,
      success: rows.filter(r => r.status === 'completed').length,
      credits: rows.reduce((s, r) => s + (r.credits_charged ?? 0), 0),
    });
  }, [user]);

  // 筛选变化重置
  useEffect(() => {
    setPage(0);
    fetchRecords(0, true);
  }, [featureTab, statusFilter, fetchRecords]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRecords(next, false);
  };

  return (
    <div className="space-y-5">
      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="总生成次数"  value={stats.total}   icon={History}       cls="bg-primary/10 text-primary" />
        <StatCard label="成功次数"    value={stats.success} icon={CheckCircle2}  cls="bg-emerald-500/10 text-emerald-500" />
        <StatCard label="消耗积分"    value={stats.credits} icon={Zap}           cls="bg-amber-500/10 text-amber-500" />
      </div>

      {/* 筛选 */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> 生成记录
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <Tabs value={featureTab} onValueChange={v => setFeatureTab(v as FeatureTab)} className="flex-1">
              <TabsList className="h-8">
                <TabsTrigger value="all"            className="text-xs h-7">全部</TabsTrigger>
                <TabsTrigger value="text_to_image"  className="text-xs h-7">文生图</TabsTrigger>
                <TabsTrigger value="image_to_video" className="text-xs h-7">图生视频</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-8 text-xs w-full md:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="processing">生成中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">已失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 列表 */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-video w-full bg-muted" />
                  <Skeleton className="h-3 w-2/3 bg-muted" />
                  <Skeleton className="h-3 w-1/2 bg-muted" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3 text-muted-foreground">
              <History className="w-10 h-10 opacity-20" />
              <p className="text-sm">暂无生成记录</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {records.map(row => (
                  <RecordCard
                    key={row.id}
                    row={row}
                    onPreview={(urls, type) => setPreview({ urls, type })}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />加载中…</>
                      : <><ChevronDown className="w-3.5 h-3.5" />加载更多</>
                    }
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground"
          onClick={() => { setPage(0); fetchRecords(0, true); fetchStats(); }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </Button>
      </div>

      {/* 预览弹窗 */}
      {preview && (
        <PreviewDialog
          urls={preview.urls}
          featureType={preview.type}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
