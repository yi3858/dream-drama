import { useState, useRef, useCallback, useId, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRechargeModal } from '@/contexts/RechargeModalContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { useChannelSelector } from '@/hooks/useChannelSelector';
import {
  ImageIcon, Wand2, Sparkles, Download, Zap, Shield, X,
  AlertTriangle, CheckCircle2, RefreshCw, Copy, ZoomIn, Info,
  PlugZap, Plus, Trash2, ListOrdered, Loader2, Clock, Upload, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StylePreviewDialog, { StyleCard, StyleCardSkeleton, StyleItem } from '@/components/common/StylePreviewDialog';

// ─── 静态降级风格列表（DB 加载失败时使用）──────────────
const FALLBACK_STYLES: StyleItem[] = [
  { id: 'anime',       label: '二次元',  desc: '日系动漫风格，色彩鲜明',   color: 'from-violet-500 to-purple-600', previewUrl: '' },
  { id: 'realistic',   label: '写实风',  desc: '商业摄影级别真实感',       color: 'from-blue-500 to-cyan-600',    previewUrl: '' },
  { id: 'cn3d',        label: '3D国漫', desc: '国产3D动漫质感',           color: 'from-orange-500 to-amber-600', previewUrl: '' },
  { id: 'inkwash',     label: '水墨风',  desc: '中国传统水墨画',           color: 'from-slate-500 to-gray-600',   previewUrl: '' },
  { id: 'western',     label: '欧美漫画',desc: '欧美英雄漫画，粗线条',     color: 'from-red-500 to-rose-600',     previewUrl: '' },
  { id: 'ancient',     label: '古风插画',desc: '国风古风，游戏原画质感',   color: 'from-yellow-500 to-amber-500', previewUrl: '' },
  { id: 'cyberpunk',   label: '赛博朋克',desc: '霓虹未来都市',             color: 'from-cyan-500 to-blue-600',    previewUrl: '' },
  { id: 'shinkai',     label: '新海诚风',desc: '唯美天空与光晕',           color: 'from-sky-500 to-indigo-500',   previewUrl: '' },
  { id: 'chibi',       label: 'Q版萌系', desc: '超萌Q版比例，贴纸设计感', color: 'from-pink-400 to-rose-500',    previewUrl: '' },
  { id: 'pixel',       label: '像素风',  desc: '16位复古游戏像素风格',     color: 'from-green-500 to-teal-600',   previewUrl: '' },
  { id: 'oilpainting', label: '厚涂插画',desc: '数字厚涂，电影级光影',     color: 'from-amber-600 to-orange-600', previewUrl: '' },
  { id: 'concept',     label: '概念艺术',desc: '幻想超现实，ArtStation',   color: 'from-indigo-500 to-purple-600',previewUrl: '' },
];

const RATIOS = [
  { id: '1:1',  label: '1:1',  desc: '方形' },
  { id: '4:3',  label: '4:3',  desc: '横版' },
  { id: '3:4',  label: '3:4',  desc: '竖版' },
  { id: '16:9', label: '16:9', desc: '宽屏' },
  { id: '9:16', label: '9:16', desc: '手机' },
];

const COUNTS = [1, 2, 4];

const QUALITIES = [
  { id: 'standard',  label: '标准',   multiplier: 1.0 },
  { id: 'fine',      label: '精细',   multiplier: 1.5 },
  { id: 'superfine', label: '超精细', multiplier: 2.5 },
];

const BASE_CREDITS_PER_IMAGE = 3;
const MAX_BATCH = 10;

// 自定义风格 ID
const CUSTOM_STYLE_ID = '__custom__';
// 用户上传最大文件尺寸（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Storage 单文件限制（1MB），超出时压缩
const STORAGE_LIMIT = 1 * 1024 * 1024;

/** 将 File 压缩到 ≤ STORAGE_LIMIT，返回 Blob（WebP）*/
async function compressImage(file: File, onProgress?: (p: number) => void): Promise<{ blob: Blob; compressed: boolean; finalSize: number }> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload  = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });

  const MAX_SIDE = 1080;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > MAX_SIDE || h > MAX_SIDE) {
    const r = Math.min(MAX_SIDE / w, MAX_SIDE / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

  // 从 0.9 逐步降质直到 ≤ STORAGE_LIMIT
  let quality = 0.9;
  let blob: Blob | null = null;
  while (quality >= 0.4) {
    blob = await new Promise<Blob>(res =>
      canvas.toBlob(b => res(b!), 'image/webp', quality),
    );
    if (blob && blob.size <= STORAGE_LIMIT) break;
    quality -= 0.1;
    onProgress?.(Math.round((0.9 - quality) / 0.5 * 50));
  }

  URL.revokeObjectURL(img.src);
  return {
    blob:       blob ?? new Blob(),
    compressed: file.size > STORAGE_LIMIT,
    finalSize:  blob?.size ?? 0,
  };
}

function calcCredits(count: number, quality: string, channelBase?: number): number {
  const q = QUALITIES.find(q => q.id === quality) ?? QUALITIES[0];
  const base = channelBase ?? BASE_CREDITS_PER_IMAGE;
  return Math.ceil(base * count * q.multiplier);
}

// ─── 批量任务类型 ──────────────────────────────────────
type BatchStatus = 'pending' | 'running' | 'done' | 'failed';

interface BatchItem {
  id:        string;
  prompt:    string;
  status:    BatchStatus;
  imageUrls: string[];
  error:     string;
}

// ─── 批量任务状态图标 ──────────────────────────────────
function BatchStatusIcon({ status }: { status: BatchStatus }) {
  if (status === 'pending')  return <Clock       className="w-4 h-4 text-muted-foreground shrink-0" />;
  if (status === 'running')  return <Loader2     className="w-4 h-4 text-primary animate-spin shrink-0" />;
  if (status === 'done')     return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />;
}

// ─── 批量任务面板 ──────────────────────────────────────
interface BatchPanelProps {
  items:       BatchItem[];
  running:     boolean;
  totalCredits: number;
  hasEnough:   boolean;
  onAddItem:   () => void;
  onRemoveItem:(id: string) => void;
  onChangePrompt:(id: string, val: string) => void;
  onSubmit:    () => void;
  onRetry:     (id: string) => void;
  onReset:     () => void;
  onDownloadAll: () => void;
}

function BatchPanel({
  items, running, totalCredits, hasEnough,
  onAddItem, onRemoveItem, onChangePrompt,
  onSubmit, onRetry, onReset, onDownloadAll,
}: BatchPanelProps) {
  const allDone   = items.length > 0 && items.every(i => i.status === 'done' || i.status === 'failed');
  const anyDone   = items.some(i => i.status === 'done');
  const doneCount = items.filter(i => i.status === 'done').length;
  const failCount = items.filter(i => i.status === 'failed').length;

  return (
    <div className="space-y-3">
      {/* 任务列表 */}
      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl border border-border/60 overflow-hidden">
            {/* 任务头 */}
            <div className={cn(
              'flex items-center gap-2 px-3 py-2',
              item.status === 'running' ? 'bg-primary/5' :
              item.status === 'done'    ? 'bg-emerald-500/5' :
              item.status === 'failed'  ? 'bg-destructive/5' : 'bg-muted/20',
            )}>
              <BatchStatusIcon status={item.status} />
              <span className="text-xs text-muted-foreground font-medium">任务 {idx + 1}</span>
              {item.status === 'failed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 ml-1"
                  onClick={() => onRetry(item.id)}
                  disabled={running}
                >
                  <RefreshCw className="w-3 h-3 mr-0.5" /> 重试
                </Button>
              )}
              {!running && item.status === 'pending' && (
                <button
                  type="button"
                  className="ml-auto p-1 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 提示词输入 */}
            {(item.status === 'pending' || item.status === 'failed') && (
              <div className="px-3 pb-3 pt-2">
                <Textarea
                  value={item.prompt}
                  onChange={e => onChangePrompt(item.id, e.target.value)}
                  placeholder={`提示词 ${idx + 1}，如：夕阳下的雪山湖泊…`}
                  className="resize-none min-h-[64px] px-2 text-sm"
                  maxLength={500}
                  disabled={running}
                />
                <p className="text-right text-[10px] text-muted-foreground mt-1">{item.prompt.length}/500</p>
              </div>
            )}

            {/* 生成中 */}
            {item.status === 'running' && (
              <div className="px-3 pb-3 pt-2 space-y-1.5">
                <p className="text-xs text-muted-foreground truncate">{item.prompt}</p>
                <div className="flex items-center gap-2">
                  <Progress value={45} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-primary shrink-0">生成中…</span>
                </div>
              </div>
            )}

            {/* 结果展示 */}
            {item.status === 'done' && item.imageUrls.length > 0 && (
              <div className="px-3 pb-3 pt-2 space-y-2">
                <p className="text-xs text-muted-foreground truncate">{item.prompt}</p>
                <div className={cn('grid gap-1.5', item.imageUrls.length >= 2 ? 'grid-cols-2' : 'grid-cols-1')}>
                  {item.imageUrls.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <a
                        href={url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors"
                      >
                        <Download className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      {!running && !allDone && items.length < MAX_BATCH && (
        <button
          type="button"
          onClick={onAddItem}
          className="w-full py-3 rounded-xl border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 text-sm text-primary/70"
        >
          <Plus className="w-4 h-4" /> 添加提示词（{items.length}/{MAX_BATCH}）
        </button>
      )}

      {/* 进度汇总 */}
      {running && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">批量生成进行中</p>
            <p className="text-xs text-muted-foreground">
              已完成 {doneCount} / {items.length} 个任务
              {failCount > 0 && <span className="text-destructive ml-1">（{failCount} 个失败）</span>}
            </p>
          </div>
        </div>
      )}

      {/* 完成汇总 */}
      {allDone && (
        <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">批量生成完成</p>
            <p className="text-xs text-muted-foreground">
              {doneCount} 个成功{failCount > 0 ? `，${failCount} 个失败（可单独重试）` : ''}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {anyDone && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onDownloadAll}>
                <Download className="w-3 h-3" /> 全部下载
              </Button>
            )}
            <Button size="sm" className="h-7 text-xs gap-1" onClick={onReset}>
              <RefreshCw className="w-3 h-3" /> 重新开始
            </Button>
          </div>
        </div>
      )}

      {/* 提交按钮 */}
      {!running && !allDone && (
        <Button
          className="w-full h-11 gap-2 text-base"
          onClick={onSubmit}
          disabled={items.length === 0 || items.every(i => !i.prompt.trim())}
        >
          {!hasEnough ? (
            <><Zap className="w-5 h-5" />积分不足，去充值</>
          ) : (
            <><ListOrdered className="w-5 h-5" />开始批量生成
              <span className="text-primary-foreground/70 text-sm">（共 {totalCredits} 积分）</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────
export default function TextToImagePage() {
  const { user, profile } = useAuth();
  const { openRechargeModal } = useRechargeModal();
  const navigate = useNavigate();
  const uid = useId();

  // 渠道选择
  const { channels, selectedId, setSelectedId, selected: selectedChannel } = useChannelSelector('text_to_image');

  // ── 动态风格列表（从 DB 加载）────────────────────────
  const [dynamicStyles, setDynamicStyles] = useState<StyleItem[]>([]);
  const [stylesReady, setStylesReady] = useState(false);
  const [previewStyle, setPreviewStyle] = useState<StyleItem | null>(null);
  const activeStyles = dynamicStyles.length > 0 ? dynamicStyles : FALLBACK_STYLES;

  useEffect(() => {
    const timer = setTimeout(() => setStylesReady(true), 500);
    supabase
      .from('style_configs')
      .select('id, label, description, color, preview_url, video_url, tags, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDynamicStyles(data.map(s => ({
            id: s.id,
            label: s.label,
            desc: s.description,
            color: s.color,
            previewUrl: s.preview_url ?? '',
            videoUrl: s.video_url ?? undefined,
            tags: s.tags ?? [],
          })));
        }
        setStylesReady(true);
      });
    return () => clearTimeout(timer);
  }, []);

  // ── 自定义风格参考图 ──────────────────────────────────
  const fileInputRef                        = useRef<HTMLInputElement>(null);
  const [customRefUrl, setCustomRefUrl]     = useState<string | null>(null);
  const [uploadingRef, setUploadingRef]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── 单次模式状态 ────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState('anime');
  const [ratio, setRatio] = useState('1:1');
  const [count, setCount] = useState(1);
  const [quality, setQuality] = useState('standard');
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  const [showNeg, setShowNeg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 生成状态（单次）
  const [step, setStep] = useState<'form' | 'generating' | 'done' | 'error'>('form');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 批量模式状态 ─────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([
    { id: `${uid}-0`, prompt: '', status: 'pending', imageUrls: [], error: '' },
  ]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchCopyrightAgreed, setBatchCopyrightAgreed] = useState(false);
  const [showBatchCopyrightDialog, setShowBatchCopyrightDialog] = useState(false);
  const batchIndexRef = useRef(0);
  const batchItemsRef = useRef<BatchItem[]>(batchItems);
  batchItemsRef.current = batchItems;

  // ── 积分计算 ─────────────────────────────────────────
  const estimatedCredits     = calcCredits(count, quality, selectedChannel?.userCredits);
  const hasEnoughCredits     = (profile?.credits ?? 0) >= estimatedCredits;
  const batchTotalCredits    = batchItems.length * estimatedCredits;
  const batchHasEnough       = (profile?.credits ?? 0) >= batchTotalCredits;

  const stopPoll = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
  }, []);

  // ── 自定义参考图：上传处理 ────────────────────────────
  const handleCustomUpload = useCallback(async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 JPG / PNG 格式');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('图片大小不能超过 10MB');
      return;
    }
    if (!user) { toast.error('请先登录'); return; }

    setUploadingRef(true);
    setUploadProgress(10);

    try {
      let uploadBlob: Blob = file;
      let compressed = false;
      let finalSize  = file.size;

      if (file.size > STORAGE_LIMIT) {
        toast.info('图片较大，正在自动压缩…');
        const result = await compressImage(file, p => setUploadProgress(10 + Math.round(p * 0.4)));
        uploadBlob  = result.blob;
        compressed  = result.compressed;
        finalSize   = result.finalSize;
        setUploadProgress(55);
      }

      const path = `${user.id}/style_ref_${Date.now()}.webp`;
      setUploadProgress(60);

      const { error: upErr } = await supabase.storage
        .from('user-style-refs')
        .upload(path, uploadBlob, { contentType: 'image/webp', upsert: true });

      if (upErr) throw new Error(upErr.message);
      setUploadProgress(95);

      const { data: urlData } = supabase.storage
        .from('user-style-refs')
        .getPublicUrl(path);

      setCustomRefUrl(urlData.publicUrl);
      setStyle(CUSTOM_STYLE_ID);
      setUploadProgress(100);

      toast.success(
        compressed
          ? `参考图已上传（已压缩至 ${(finalSize / 1024).toFixed(0)} KB）`
          : '参考图上传成功',
      );
    } catch (err) {
      toast.error(`上传失败：${String(err)}`);
    } finally {
      setUploadingRef(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleCustomUpload(file);
    },
    [handleCustomUpload],
  );

  const clearCustomRef = useCallback(() => {
    setCustomRefUrl(null);
    setStyle('anime');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── 单次：轮询旧 EF ────────────────────────────────
  const pollStatus = useCallback(async (tid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-image', {
        body: { action: 'status', taskId: tid },
      });
      if (error) { const m = await error?.context?.text(); console.error('poll:', m); return; }

      const { taskStatus, progress: p } = data as { taskStatus: string; progress: number };
      setProgress(Math.min(p ?? 50, 95));

      const msgMap: Record<string, string> = {
        QUEUING: '排队等待中…', RUNNING: '图片生成中…',
        SUCCESS: '生成完成！',  FAILED: '生成失败',   CANCELED: '任务已取消',
      };
      setProgressMsg(msgMap[taskStatus] ?? '处理中…');

      if (taskStatus === 'SUCCESS') {
        stopPoll();
        const { data: res } = await supabase.functions.invoke('text-to-image', {
          body: { action: 'result', taskId: tid },
        });
        const urls = (res as { imageUrls: string[] })?.imageUrls ?? [];
        setImageUrls(urls); setProgress(100); setProgressMsg('图片生成完成！'); setStep('done');
        await supabase.from('profiles').update({ credits: (profile?.credits ?? 0) - estimatedCredits }).eq('id', user!.id);
        toast.success(`已生成 ${urls.length} 张图片！`);
      } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
        stopPoll(); setStep('error');
        toast.error('图片生成失败，积分已退还');
      }
    } catch (err) { console.error('poll exception:', err); }
  }, [stopPoll, estimatedCredits, profile, user]);

  // ── 单次：轮询 dispatch-generation ────────────────
  const pollDispatch = useCallback(async (taskId: string, channelId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-generation', {
        body: { action: 'status', taskId, channel_id: channelId },
      });
      if (error) { const m = await error?.context?.text(); console.error('poll dispatch:', m); return; }

      const { status, progress: p } = data as { status: string; progress: number };
      setProgress(Math.min(p ?? 50, 95));
      const msgMap: Record<string, string> = {
        processing: '图片生成中…', completed: '生成完成！', failed: '生成失败',
      };
      setProgressMsg(msgMap[status] ?? '处理中…');

      if (status === 'completed') {
        stopPoll();
        const { data: res, error: resErr } = await supabase.functions.invoke('dispatch-generation', {
          body: { action: 'result', taskId, channel_id: channelId },
        });
        if (resErr) { setStep('error'); return; }
        const urls = (res as { resultUrls: string[] })?.resultUrls ?? [];
        setImageUrls(urls); setProgress(100); setProgressMsg('图片生成完成！'); setStep('done');
        toast.success(`已生成 ${urls.length} 张图片！（积分已自动扣除）`);
      } else if (status === 'failed') {
        stopPoll(); setStep('error');
        toast.error('图片生成失败，积分已退还');
      }
    } catch (err) { console.error('pollDispatch exception:', err); }
  }, [stopPoll]);

  // ── 单次：提交 ────────────────────────────────────
  const startGeneration = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    if (!hasEnoughCredits) { openRechargeModal(); return; }
    if (!prompt.trim()) { toast.error('请填写提示词'); return; }

    setLoading(true); setStep('generating'); setProgress(10); setProgressMsg('提交生成任务…');
    try {
      let tid: string;
      if (selectedId) {
        const { data, error } = await supabase.functions.invoke('dispatch-generation', {
          body: { action: 'submit', channel_id: selectedId, prompt: prompt.trim(),
                  feature_type: 'text_to_image', credits_override: estimatedCredits,
                  params: { negativePrompt, style, ratio, count, quality,
                            ...(style === CUSTOM_STYLE_ID && customRefUrl ? { styleRefUrl: customRefUrl } : {}) } },
        });
        if (error) { const m = await error?.context?.text(); throw new Error(m || '提交失败'); }
        tid = (data as { taskId: string }).taskId;
        if (!tid) throw new Error('未获取到任务ID');
        setProgress(25); setProgressMsg('任务已提交，生成中…');
        pollIntervalRef.current = setInterval(() => pollDispatch(tid, selectedId), 3000);
      } else {
        const { data, error } = await supabase.functions.invoke('text-to-image', {
          body: { action: 'submit', prompt: prompt.trim(), negativePrompt, style, ratio, count, quality,
                  ...(style === CUSTOM_STYLE_ID && customRefUrl ? { styleRefUrl: customRefUrl } : {}) },
        });
        if (error) { const m = await error?.context?.text(); throw new Error(m || '提交失败'); }
        tid = (data as { taskId: string }).taskId;
        if (!tid) throw new Error('未获取到任务ID');
        setProgress(25); setProgressMsg('任务已提交，排队生成中…');
        pollIntervalRef.current = setInterval(() => pollStatus(tid), 3000);
      }
    } catch (err) { setStep('error'); toast.error(String(err)); }
    finally { setLoading(false); }
  }, [user, hasEnoughCredits, prompt, negativePrompt, style, ratio, count, quality,
      estimatedCredits, selectedId, customRefUrl, pollStatus, pollDispatch, navigate, openRechargeModal]);

  const handleSubmit = () => {
    if (!user) { navigate('/login'); return; }
    if (!prompt.trim()) { toast.error('请填写提示词'); return; }
    if (!copyrightAgreed) { setShowCopyrightDialog(true); return; }
    startGeneration();
  };
  const handleReset = () => { stopPoll(); setStep('form'); setProgress(0); setProgressMsg(''); setImageUrls([]); };

  // ── 批量：提交单个任务 ───────────────────────────
  const runBatchItem = useCallback(async (itemId: string) => {
    const items = batchItemsRef.current;
    const item  = items.find(i => i.id === itemId);
    if (!item || !item.prompt.trim()) {
      setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'failed', error: '提示词为空' } : i));
      return;
    }

    setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'running' } : i));

    try {
      let tid: string;
      if (selectedId) {
        const { data, error } = await supabase.functions.invoke('dispatch-generation', {
          body: { action: 'submit', channel_id: selectedId, prompt: item.prompt.trim(),
                  feature_type: 'text_to_image', credits_override: estimatedCredits,
                  params: { style, ratio, count, quality,
                            ...(style === CUSTOM_STYLE_ID && customRefUrl ? { styleRefUrl: customRefUrl } : {}) } },
        });
        if (error) { const m = await error?.context?.text(); throw new Error(m || '提交失败'); }
        tid = (data as { taskId: string }).taskId;
        if (!tid) throw new Error('未获取到任务ID');

        // 等待完成（轮询）
        await new Promise<void>((resolve, reject) => {
          const iv = setInterval(async () => {
            try {
              const { data: sd } = await supabase.functions.invoke('dispatch-generation', {
                body: { action: 'status', taskId: tid, channel_id: selectedId },
              });
              const s = (sd as { status: string })?.status;
              if (s === 'completed') {
                clearInterval(iv);
                const { data: rd } = await supabase.functions.invoke('dispatch-generation', {
                  body: { action: 'result', taskId: tid, channel_id: selectedId },
                });
                const urls = (rd as { resultUrls: string[] })?.resultUrls ?? [];
                setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'done', imageUrls: urls } : i));
                resolve();
              } else if (s === 'failed') {
                clearInterval(iv); reject(new Error('生成失败'));
              }
            } catch (e) { clearInterval(iv); reject(e); }
          }, 3000);
        });
      } else {
        const { data, error } = await supabase.functions.invoke('text-to-image', {
          body: { action: 'submit', prompt: item.prompt.trim(), style, ratio, count, quality,
                  ...(style === CUSTOM_STYLE_ID && customRefUrl ? { styleRefUrl: customRefUrl } : {}) },
        });
        if (error) { const m = await error?.context?.text(); throw new Error(m || '提交失败'); }
        tid = (data as { taskId: string }).taskId;
        if (!tid) throw new Error('未获取到任务ID');

        await new Promise<void>((resolve, reject) => {
          const iv = setInterval(async () => {
            try {
              const { data: sd } = await supabase.functions.invoke('text-to-image', {
                body: { action: 'status', taskId: tid },
              });
              const ts = (sd as { taskStatus: string })?.taskStatus;
              if (ts === 'SUCCESS') {
                clearInterval(iv);
                const { data: rd } = await supabase.functions.invoke('text-to-image', {
                  body: { action: 'result', taskId: tid },
                });
                const urls = (rd as { imageUrls: string[] })?.imageUrls ?? [];
                setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'done', imageUrls: urls } : i));
                await supabase.from('profiles').update({ credits: (profile?.credits ?? 0) - estimatedCredits }).eq('id', user!.id);
                resolve();
              } else if (ts === 'FAILED' || ts === 'CANCELED') {
                clearInterval(iv); reject(new Error('生成失败'));
              }
            } catch (e) { clearInterval(iv); reject(e); }
          }, 3000);
        });
      }
    } catch (err) {
      setBatchItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'failed', error: String(err) } : i));
    }
  }, [selectedId, estimatedCredits, style, ratio, count, quality, customRefUrl, profile, user]);

  // ── 批量：顺序执行所有 ────────────────────────────
  const runBatchSequential = useCallback(async (ids: string[]) => {
    setBatchRunning(true);
    for (const id of ids) {
      await runBatchItem(id);
    }
    setBatchRunning(false);
    toast.success('批量生成完成！');
  }, [runBatchItem]);

  const handleBatchSubmit = () => {
    if (!user) { navigate('/login'); return; }
    if (!batchHasEnough) { openRechargeModal(); return; }
    const validItems = batchItems.filter(i => i.prompt.trim() && i.status === 'pending');
    if (validItems.length === 0) { toast.error('请至少填写一条提示词'); return; }
    if (!batchCopyrightAgreed) { setShowBatchCopyrightDialog(true); return; }
    runBatchSequential(validItems.map(i => i.id));
  };

  const handleBatchReset = () => {
    setBatchRunning(false);
    setBatchItems([{ id: `${uid}-reset-${Date.now()}`, prompt: '', status: 'pending', imageUrls: [], error: '' }]);
  };

  const handleBatchRetry = useCallback((id: string) => {
    setBatchItems(prev => prev.map(i => i.id === id ? { ...i, status: 'pending', imageUrls: [], error: '' } : i));
    runBatchSequential([id]);
  }, [runBatchSequential]);

  const handleBatchDownloadAll = () => {
    batchItems.forEach(item => {
      item.imageUrls.forEach((url, i) => {
        const a = document.createElement('a');
        a.href = url; a.download = `batch_${item.id}_${i}.jpg`;
        a.target = '_blank'; a.click();
      });
    });
  };

  // ── 单次 - 生成中 ─────────────────────────────────
  if (!batchMode && step === 'generating') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ImageIcon className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-lg">{progressMsg}</p>
            <p className="text-sm text-muted-foreground mt-1">图片生成需要一点时间，请稍候</p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">{progress}%</p>
        </div>
      </div>
    );
  }

  // ── 单次 - 完成 ───────────────────────────────────
  if (!batchMode && step === 'done') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold">生成完成</h2>
              <p className="text-xs text-muted-foreground">共 {imageUrls.length} 张</p>
            </div>
          </div>

          <div className={cn('grid gap-3', imageUrls.length >= 4 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2')}>
            {imageUrls.map((url, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-muted/20">
                <img src={url} alt={`生成图片 ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center gap-2 transition-colors">
                  <button type="button" onClick={() => setPreviewUrl(url)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </button>
                  <a href={url} download target="_blank" rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="w-5 h-5 text-white" />
                  </a>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(prompt); toast.success('提示词已复制'); }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleReset}>
              <RefreshCw className="w-4 h-4" /> 继续生成
            </Button>
            {imageUrls.length > 0 && (
              <a href={imageUrls[0]} download target="_blank" rel="noreferrer" className="flex-1">
                <Button className="w-full gap-2"><Download className="w-4 h-4" /> 下载全部</Button>
              </a>
            )}
          </div>
        </div>

        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl p-2 bg-black/90 border-border/40">
            <button type="button" onClick={() => setPreviewUrl(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
            {previewUrl && <img src={previewUrl} alt="预览" className="w-full rounded-lg object-contain max-h-[80vh]" />}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── 单次 - 错误 ───────────────────────────────────
  if (!batchMode && step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <p className="font-semibold">生成失败</p>
            <p className="text-sm text-muted-foreground mt-1">积分已退还，请重试</p>
          </div>
          <Button onClick={handleReset} className="gap-2"><RefreshCw className="w-4 h-4" /> 重试</Button>
        </div>
      </div>
    );
  }

  // ── 公共参数区（风格/比例/数量/精细度/渠道）──────
  const ParamCards = (
    <>
      {/* 隐藏文件选择 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 风格 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              {batchMode ? '2' : '2'}
            </span>
            选择画面风格
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stylesReady ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <StyleCardSkeleton key={i} />)}
              <StyleCardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* DB 风格卡片 */}
              {activeStyles.map(s => (
                <StyleCard
                  key={s.id}
                  style={s}
                  selected={style === s.id}
                  onSelect={() => setStyle(s.id)}
                  onPreview={() => setPreviewStyle(s)}
                />
              ))}

              {/* 自定义上传卡片 */}
              {customRefUrl ? (
                /* 已上传：显示参考图预览 */
                <div
                  className={cn(
                    'relative rounded-2xl overflow-hidden cursor-pointer group will-change-transform',
                    style === CUSTOM_STYLE_ID
                      ? 'ring-2 ring-primary shadow-[0_0_16px_hsl(var(--primary)/0.3)]'
                      : 'ring-1 ring-border/60 hover:ring-primary/40 hover:shadow-card transition-shadow duration-300',
                  )}
                  onClick={() => setStyle(CUSTOM_STYLE_ID)}
                >
                  {/* 预览图 */}
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={customRefUrl}
                      alt="自定义参考图"
                      className={cn(
                        'w-full h-full object-cover transition-[transform,filter] duration-500 ease-out',
                        'group-hover:scale-[1.07] group-hover:brightness-110',
                        style === CUSTOM_STYLE_ID ? 'scale-[1.03]' : '',
                      )}
                    />
                  </div>

                  {/* 选中时渐变覆层 */}
                  <div className={cn(
                    'absolute inset-0 transition-opacity duration-300 pointer-events-none',
                    'bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/8',
                    style === CUSTOM_STYLE_ID ? 'opacity-100' : 'opacity-0',
                  )} />

                  {/* 选中勾 */}
                  {style === CUSTOM_STYLE_ID && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full gradient-primary-bg flex items-center justify-center shadow-[0_0_10px_hsl(var(--primary)/0.7)]">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* 右上角：重新上传 & 删除 */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/75 ring-1 ring-white/15"
                      aria-label="重新上传"
                    >
                      <RotateCcw className="w-3 h-3 text-white/85" />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); clearCustomRef(); }}
                      className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/80 ring-1 ring-white/15"
                      aria-label="删除参考图"
                    >
                      <X className="w-3 h-3 text-white/85" />
                    </button>
                  </div>

                  {/* 底部标签 */}
                  <div className={cn(
                    'px-3 py-2.5 transition-[background] duration-300',
                    style === CUSTOM_STYLE_ID ? 'bg-primary/12' : 'bg-card',
                  )}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-primary to-cyan-500 shrink-0" />
                      <span className="text-sm font-medium truncate">自定义参考</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">以上传图片为风格参考</p>
                  </div>
                </div>
              ) : (
                /* 未上传："+"上传入口 */
                <button
                  type="button"
                  disabled={uploadingRef}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'relative rounded-2xl overflow-hidden cursor-pointer group',
                    'ring-1 border border-dashed border-border/60 hover:border-primary/50',
                    'hover:bg-primary/4 transition-all duration-300',
                    'flex flex-col items-center justify-center gap-2',
                    'aspect-video md:aspect-auto', // 移动端保持比例，桌面端拉伸填满格子
                    uploadingRef ? 'pointer-events-none' : '',
                  )}
                  style={{ minHeight: '108px' }}
                  aria-label="上传自定义风格参考图"
                >
                  {uploadingRef ? (
                    /* 上传进度 */
                    <div className="w-full px-4 space-y-2">
                      <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/12 group-hover:scale-110 transition-all duration-200">
                        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                      </div>
                      <div className="text-center px-2">
                        <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">自定义上传</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">JPG/PNG · 最大 10MB</p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 渠道 */}
      {channels.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
              选择 AI 渠道
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {channels.map(ch => (
                <button key={ch.id} type="button" onClick={() => setSelectedId(ch.id)}
                  className={cn('p-3 rounded-xl border text-left transition-all duration-150 flex items-center gap-3',
                    selectedId === ch.id ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                    : 'border-border/60 hover:border-primary/40 hover:bg-muted/40')}>
                  <PlugZap className={cn('w-4 h-4 shrink-0', selectedId === ch.id ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{ch.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ch.userCredits} 积分/次起</p>
                  </div>
                  {selectedId === ch.id && (
                    <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] shrink-0">已选</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 参数 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              {channels.length > 0 ? '4' : '3'}
            </span>
            图片参数
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-normal">图片比例</Label>
            <div className="flex flex-wrap gap-2">
              {RATIOS.map(r => (
                <button key={r.id} type="button" onClick={() => setRatio(r.id)}
                  className={cn('px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                    ratio === r.id ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground')}>
                  {r.label} <span className="text-[11px] opacity-60">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-normal">生成数量</Label>
            <div className="flex gap-2">
              {COUNTS.map(c => (
                <button key={c} type="button" onClick={() => setCount(c)}
                  className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                    count === c ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground')}>
                  {c} 张
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-normal">精细度</Label>
            <div className="flex gap-2">
              {QUALITIES.map(q => (
                <button key={q.id} type="button" onClick={() => setQuality(q.id)}
                  className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                    quality === q.id ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground')}>
                  {q.label}
                  <span className="text-[10px] block text-muted-foreground">×{q.multiplier}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );

  // ── 表单 ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 页头 + 模式切换 */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">文生图</h1>
              <Badge className="bg-primary/15 text-primary border-primary/20 text-xs rounded-full">AI 驱动</Badge>
            </div>
            <p className="text-sm text-muted-foreground">输入文字描述，AI 一键生成精美图片</p>
          </div>

          {/* 批量模式开关 */}
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <Label htmlFor="batch-toggle" className="text-sm cursor-pointer">批量模式</Label>
            <Switch
              id="batch-toggle"
              checked={batchMode}
              onCheckedChange={v => { setBatchMode(v); if (!v) handleReset(); }}
              disabled={batchRunning}
            />
          </div>
        </div>

        {batchMode ? (
          /* ════════════════ 批量模式 ═══════════════════ */
          <>
            {/* 提示词队列 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  添加提示词队列
                  <Badge variant="outline" className="text-[10px] ml-auto">{batchItems.length}/{MAX_BATCH}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BatchPanel
                  items={batchItems}
                  running={batchRunning}
                  totalCredits={batchTotalCredits}
                  hasEnough={batchHasEnough}
                  onAddItem={() => {
                    if (batchItems.length < MAX_BATCH) {
                      setBatchItems(prev => [...prev, { id: `${uid}-${Date.now()}`, prompt: '', status: 'pending', imageUrls: [], error: '' }]);
                    }
                  }}
                  onRemoveItem={id => setBatchItems(prev => prev.filter(i => i.id !== id))}
                  onChangePrompt={(id, val) => setBatchItems(prev => prev.map(i => i.id === id ? { ...i, prompt: val } : i))}
                  onSubmit={handleBatchSubmit}
                  onRetry={handleBatchRetry}
                  onReset={handleBatchReset}
                  onDownloadAll={handleBatchDownloadAll}
                />
              </CardContent>
            </Card>

            {/* 全局参数 */}
            {ParamCards}

            {/* 积分汇总 */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">总积分消耗</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {batchItems.length} 个任务 · {count} 张/任务 · {QUALITIES.find(q => q.id === quality)?.label}
                      {selectedChannel && <span> · {selectedChannel.name}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{batchTotalCredits}</p>
                    <p className="text-xs text-muted-foreground">积分</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-primary" /> 余额：{profile?.credits ?? 0} 积分</span>
                  {!batchHasEnough && user && (
                    <span className="text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 积分不足</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 批量版权弹窗 */}
            <Dialog open={showBatchCopyrightDialog} onOpenChange={setShowBatchCopyrightDialog}>
              <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" /> 合规声明
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>批量生成内容仅用于合法合规目的，不包含违法、暴力、色情等内容。</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBatchCopyrightDialog(false)}>取消</Button>
                  <Button onClick={() => {
                    setBatchCopyrightAgreed(true);
                    setShowBatchCopyrightDialog(false);
                    const validItems = batchItems.filter(i => i.prompt.trim() && i.status === 'pending');
                    runBatchSequential(validItems.map(i => i.id));
                  }}>
                    同意并开始生成
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          /* ════════════════ 单次模式 ═══════════════════ */
          <>
            {/* 提示词 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  描述你想要的画面
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="描述画面内容，如：一只橙色小猫坐在樱花树下，阳光洒落，柔美氛围…"
                    className="resize-none min-h-[90px] px-3 text-sm"
                    maxLength={500}
                  />
                  <div className="flex justify-between">
                    <button type="button" className="text-xs text-primary flex items-center gap-1"
                      onClick={() => setShowNeg(v => !v)}>
                      <Info className="w-3 h-3" /> {showNeg ? '收起' : '添加反向提示词（排除不想要的元素）'}
                    </button>
                    <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
                  </div>
                </div>
                {showNeg && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">反向提示词（可选）</Label>
                    <Textarea
                      value={negativePrompt}
                      onChange={e => setNegativePrompt(e.target.value)}
                      placeholder="如：模糊、低质量、变形、水印…"
                      className="resize-none min-h-[60px] px-3 text-sm"
                      maxLength={300}
                    />
                    <p className="text-right text-xs text-muted-foreground">{negativePrompt.length}/300</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {ParamCards}

            {/* 费用 + 生成 */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">本次消耗</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count} 张 · {QUALITIES.find(q => q.id === quality)?.label} · {style === CUSTOM_STYLE_ID ? '自定义参考' : activeStyles.find(s => s.id === style)?.label}
                      {selectedChannel && <span> · {selectedChannel.name}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{estimatedCredits}</p>
                    <p className="text-xs text-muted-foreground">积分</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-primary" /> 余额：{profile?.credits ?? 0} 积分</span>
                  {!hasEnoughCredits && user && (
                    <span className="text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 积分不足</span>
                  )}
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Checkbox id="cp" checked={copyrightAgreed} onCheckedChange={v => setCopyrightAgreed(!!v)} className="mt-0.5 shrink-0" />
                  <label htmlFor="cp" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                    我承诺生成内容仅用于合法用途，不包含任何违法或侵权内容
                  </label>
                </div>

                <Button className="w-full h-11 gap-2 text-base" onClick={handleSubmit} disabled={loading || !prompt.trim()}>
                  {!user ? (
                    <><Sparkles className="w-5 h-5" />登录后开始生成</>
                  ) : !hasEnoughCredits ? (
                    <><Zap className="w-5 h-5" />积分不足，去充值</>
                  ) : (
                    <><Wand2 className="w-5 h-5" />立即生成 <span className="text-primary-foreground/70 text-sm">（{estimatedCredits} 积分）</span></>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 版权弹窗 */}
            <Dialog open={showCopyrightDialog} onOpenChange={setShowCopyrightDialog}>
              <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" /> 合规声明
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>生成内容仅用于合法合规目的，不包含违法、暴力、色情等内容。</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCopyrightDialog(false)}>取消</Button>
                  <Button onClick={() => { setCopyrightAgreed(true); setShowCopyrightDialog(false); startGeneration(); }}>
                    同意并生成
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* 风格大图预览弹窗 */}
      <StylePreviewDialog style={previewStyle} onClose={() => setPreviewStyle(null)} />
    </div>
  );
}
