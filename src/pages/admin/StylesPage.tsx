import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Upload, Trash2, Play, Film, CheckCircle2,
  RefreshCw, Loader2, AlertCircle, Eye, Plus, X, ImageIcon,
} from 'lucide-react';
import StylePreviewDialog from '@/components/common/StylePreviewDialog';
import type { StyleItem } from '@/components/common/StylePreviewDialog';

// ─── 常量 ─────────────────────────────────────────────
const BUCKET = 'style-assets';
const MAX_VIDEO_MB = 50;
const MAX_IMAGE_MB = 5;

// 预设渐变色板（值 = Tailwind gradient class）
const GRADIENT_PRESETS = [
  { label: '紫罗兰', value: 'from-violet-500 to-purple-600' },
  { label: '深蓝青', value: 'from-blue-500 to-cyan-600' },
  { label: '橙琥珀', value: 'from-orange-500 to-amber-600' },
  { label: '翠绿', value: 'from-emerald-500 to-green-600' },
  { label: '玫瑰粉', value: 'from-pink-500 to-rose-600' },
  { label: '金黄', value: 'from-yellow-500 to-amber-600' },
  { label: '青蓝', value: 'from-cyan-500 to-blue-700' },
  { label: '天蓝靛', value: 'from-sky-400 to-indigo-500' },
  { label: '洋红桃', value: 'from-fuchsia-400 to-pink-500' },
  { label: '青柠', value: 'from-lime-400 to-green-600' },
  { label: '深紫粉', value: 'from-purple-400 to-pink-600' },
  { label: '蓝石板', value: 'from-blue-600 to-slate-700' },
  { label: '石板灰', value: 'from-slate-600 to-gray-900' },
  { label: '橙红', value: 'from-orange-400 to-red-500' },
  { label: '青绿', value: 'from-teal-400 to-emerald-600' },
  { label: '粉紫', value: 'from-pink-400 to-violet-600' },
];

// ─── 类型 ─────────────────────────────────────────────
interface StyleConfig {
  id: string;
  label: string;
  description: string;
  color: string;
  preview_url: string;
  video_url: string | null;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

interface UploadState {
  styleId: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  message?: string;
}

interface NewStyleForm {
  id: string;
  label: string;
  description: string;
  color: string;
  tags: string[];
  previewFile: File | null;
  previewPreview: string; // object URL for local preview
  sort_order: number;
}

const EMPTY_FORM: NewStyleForm = {
  id: '',
  label: '',
  description: '',
  color: 'from-violet-500 to-purple-600',
  tags: [],
  previewFile: null,
  previewPreview: '',
  sort_order: 0,
};

// ─── 子组件：标签输入 ────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (!v || tags.includes(v) || tags.length >= 6) return;
    onChange([...tags, v]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="输入标签后按 Enter 添加（最多6个）"
          className="h-8 text-sm px-3"
          maxLength={12}
        />
        <Button type="button" variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs bg-primary/10 text-primary border-primary/20 rounded-full pl-2.5 pr-1.5 gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter(t => t !== tag))}
                className="w-3.5 h-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 子组件：渐变色板选择器 ──────────────────────────
function GradientPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {GRADIENT_PRESETS.map(g => (
        <button
          key={g.value}
          type="button"
          title={g.label}
          onClick={() => onChange(g.value)}
          className={[
            'w-full aspect-square rounded-md bg-gradient-to-br transition-transform duration-150',
            g.value,
            value === g.value
              ? 'ring-2 ring-offset-1 ring-offset-background ring-primary scale-110'
              : 'hover:scale-105',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────
export default function AdminStylesPage() {
  const [styles, setStyles] = useState<StyleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadMap, setUploadMap] = useState<Record<string, UploadState>>({});
  const [previewStyle, setPreviewStyle] = useState<StyleItem | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  // 新增画风 Dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<NewStyleForm>(EMPTY_FORM);
  const [tagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const previewImgRef = useRef<HTMLInputElement | null>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<StyleConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── 加载 ──
  const loadStyles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('style_configs')
      .select('*')
      .order('sort_order');
    if (error) toast.error('加载画风配置失败：' + error.message);
    else setStyles(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadStyles(); }, [loadStyles]);

  // ── 工具：上传文件到 bucket ──
  const uploadFile = useCallback(async (
    path: string,
    file: File,
    onProgress: (p: number) => void,
  ): Promise<string | null> => {
    let fake = 0;
    const timer = setInterval(() => {
      fake = Math.min(fake + 12, 85);
      onProgress(fake);
    }, 180);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    clearInterval(timer);
    if (error) { onProgress(0); return null; }

    onProgress(100);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  // ── 上传演示视频 ──
  const uploadVideo = useCallback(async (styleId: string, file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('只支持视频文件（mp4 / webm / mov）'); return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`视频不能超过 ${MAX_VIDEO_MB}MB`); return;
    }

    const ext = file.name.split('.').pop() ?? 'mp4';
    const path = `videos/${styleId}_${Date.now()}.${ext}`;

    setUploadMap(prev => ({ ...prev, [styleId]: { styleId, progress: 0, status: 'uploading' } }));

    // 删旧文件
    const existing = styles.find(s => s.id === styleId);
    if (existing?.video_url) {
      try {
        const old = new URL(existing.video_url).pathname.split(`/${BUCKET}/`)[1];
        if (old) await supabase.storage.from(BUCKET).remove([old]);
      } catch { /* ignore */ }
    }

    const url = await uploadFile(path, file, p =>
      setUploadMap(prev => ({ ...prev, [styleId]: { styleId, progress: p, status: 'uploading' } }))
    );

    if (!url) {
      setUploadMap(prev => ({ ...prev, [styleId]: { styleId, progress: 0, status: 'error', message: '上传失败' } }));
      toast.error('视频上传失败'); return;
    }

    const { error } = await supabase.from('style_configs')
      .update({ video_url: url, updated_at: new Date().toISOString() })
      .eq('id', styleId);

    if (error) {
      setUploadMap(prev => ({ ...prev, [styleId]: { styleId, progress: 0, status: 'error', message: error.message } }));
      toast.error('保存失败：' + error.message); return;
    }

    setUploadMap(prev => ({ ...prev, [styleId]: { styleId, progress: 100, status: 'success' } }));
    setStyles(prev => prev.map(s => s.id === styleId ? { ...s, video_url: url } : s));
    toast.success(`「${existing?.label}」演示视频上传成功`);
    setTimeout(() => setUploadMap(prev => { const n = { ...prev }; delete n[styleId]; return n; }), 3000);
  }, [styles, uploadFile]);

  // ── 删除演示视频 ──
  const removeVideo = useCallback(async (style: StyleConfig) => {
    if (!style.video_url) return;
    try {
      const old = new URL(style.video_url).pathname.split(`/${BUCKET}/`)[1];
      if (old) await supabase.storage.from(BUCKET).remove([old]);
    } catch { /* ignore */ }
    const { error } = await supabase.from('style_configs')
      .update({ video_url: null, updated_at: new Date().toISOString() })
      .eq('id', style.id);
    if (error) { toast.error('删除失败：' + error.message); return; }
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, video_url: null } : s));
    toast.success(`「${style.label}」演示视频已删除`);
  }, []);

  // ── 删除画风 ──
  const deleteStyle = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // 删除存储文件
    const paths: string[] = [];
    if (deleteTarget.preview_url) {
      try { paths.push(new URL(deleteTarget.preview_url).pathname.split(`/${BUCKET}/`)[1]); } catch { /* */ }
    }
    if (deleteTarget.video_url) {
      try { paths.push(new URL(deleteTarget.video_url).pathname.split(`/${BUCKET}/`)[1]); } catch { /* */ }
    }
    if (paths.filter(Boolean).length) {
      await supabase.storage.from(BUCKET).remove(paths.filter(Boolean));
    }
    const { error } = await supabase.from('style_configs').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error('删除失败：' + error.message); return; }
    setStyles(prev => prev.filter(s => s.id !== deleteTarget.id));
    toast.success(`画风「${deleteTarget.label}」已删除`);
    setDeleteTarget(null);
  }, [deleteTarget]);

  // ── 拖拽 ──
  const handleDrop = useCallback((e: React.DragEvent, styleId: string) => {
    e.preventDefault(); setDragOver(null);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) uploadVideo(styleId, file);
  }, [uploadVideo]);

  // ── 新增画风 - 表单字段更新 ──
  const setField = <K extends keyof NewStyleForm>(key: K, val: NewStyleForm[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // 本地图片预览
  const handlePreviewImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('请上传图片文件'); return; }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`图片不能超过 ${MAX_IMAGE_MB}MB`); return; }
    const url = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, previewFile: file, previewPreview: url }));
  };

  // ── 新增画风 - 提交 ──
  const handleAddStyle = useCallback(async () => {
    // 校验
    if (!form.id.trim()) { toast.error('请填写画风 ID'); return; }
    if (!/^[a-z0-9-]+$/.test(form.id.trim())) { toast.error('ID 只能包含小写字母、数字和连字符'); return; }
    if (!form.label.trim()) { toast.error('请填写画风名称'); return; }
    if (!form.description.trim()) { toast.error('请填写描述'); return; }
    if (!form.previewFile) { toast.error('请上传预览图片'); return; }

    // 检查 ID 重复
    if (styles.some(s => s.id === form.id.trim())) {
      toast.error(`ID「${form.id}」已存在，请换一个`); return;
    }

    setSaving(true);

    // 上传预览图
    const imgExt = form.previewFile.name.split('.').pop() ?? 'jpg';
    const imgPath = `previews/${form.id.trim()}_${Date.now()}.${imgExt}`;
    const previewUrl = await uploadFile(imgPath, form.previewFile, () => {});

    if (!previewUrl) {
      toast.error('预览图上传失败'); setSaving(false); return;
    }

    // 确定排序号
    const maxOrder = styles.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const sortOrder = form.sort_order > 0 ? form.sort_order : maxOrder + 1;

    // 写入 DB
    const { error } = await supabase.from('style_configs').insert({
      id: form.id.trim(),
      label: form.label.trim(),
      description: form.description.trim(),
      color: form.color,
      preview_url: previewUrl,
      video_url: null,
      tags: form.tags,
      sort_order: sortOrder,
      is_active: true,
    });

    setSaving(false);

    if (error) { toast.error('新增失败：' + error.message); return; }

    toast.success(`画风「${form.label}」新增成功`);
    setAddOpen(false);
    setForm(EMPTY_FORM);
    loadStyles();
  }, [form, styles, uploadFile, loadStyles]);

  // 关闭新增 Dialog 时清理 objectURL
  const handleCloseAdd = () => {
    if (form.previewPreview) URL.revokeObjectURL(form.previewPreview);
    setForm(EMPTY_FORM);
    setAddOpen(false);
  };

  // ── 预览转换 ──
  const toStyleItem = (s: StyleConfig): StyleItem => ({
    id: s.id, label: s.label, desc: s.description, color: s.color,
    previewUrl: s.preview_url, videoUrl: s.video_url ?? undefined, tags: s.tags,
  });

  const stats = {
    total: styles.length,
    withVideo: styles.filter(s => s.video_url).length,
  };

  // ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">画风配置</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            管理创作页面的画风选项，上传演示视频或新增自定义画风
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button variant="outline" size="sm" onClick={loadStyles} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> 刷新
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> 新增画风
          </Button>
        </div>
      </div>

      {/* 统计条 */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: '画风总数', value: stats.total, color: 'text-primary' },
          { label: '已上传视频', value: stats.withVideo, color: 'text-green-400' },
          { label: '待上传视频', value: stats.total - stats.withVideo, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="flex-1 min-w-[110px]">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 说明 */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 border border-border/50">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/70" />
        <span>
          视频支持 MP4 / WebM / MOV，不超过 {MAX_VIDEO_MB}MB；
          预览图支持 JPG / PNG / WebP，不超过 {MAX_IMAGE_MB}MB。
          可将视频文件直接拖拽到卡片上快速上传。
        </span>
      </div>

      {/* 画风网格 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-video bg-muted rounded-lg mb-3" />
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {styles.map(style => {
            const upload = uploadMap[style.id];
            const isDragTarget = dragOver === style.id;
            const hasVideo = !!style.video_url;

            return (
              <Card
                key={style.id}
                className={`overflow-hidden transition-colors duration-200 ${isDragTarget ? 'border-primary ring-2 ring-primary/30' : ''}`}
              >
                <CardContent className="p-0">
                  {/* 预览区 */}
                  <div
                    className="relative aspect-video bg-muted overflow-hidden group/thumb"
                    onDragOver={e => { e.preventDefault(); setDragOver(style.id); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop(e, style.id)}
                  >
                    {style.preview_url ? (
                      <img src={style.preview_url} alt={style.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* 拖拽遮罩 */}
                    {isDragTarget && (
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                        <Upload className="w-8 h-8 text-primary animate-bounce" />
                        <span className="text-sm font-medium text-primary">松开即可上传</span>
                      </div>
                    )}

                    {/* hover 操作层 */}
                    {!isDragTarget && (
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                        <button onClick={() => setPreviewStyle(toStyleItem(style))}
                          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 transition-colors" title="预览">
                          {hasVideo ? <Play className="w-4 h-4 text-white fill-white ml-0.5" /> : <Eye className="w-4 h-4 text-white" />}
                        </button>
                        <button onClick={() => fileInputRefs.current[style.id]?.click()}
                          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 transition-colors" title={hasVideo ? '重新上传视频' : '上传视频'}>
                          <Upload className="w-4 h-4 text-white" />
                        </button>
                        {hasVideo && (
                          <button onClick={() => removeVideo(style)}
                            className="w-9 h-9 rounded-full bg-red-500/25 hover:bg-red-500/50 backdrop-blur-sm flex items-center justify-center ring-1 ring-red-400/30 transition-colors" title="删除视频">
                            <Trash2 className="w-4 h-4 text-red-300" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* 视频状态角标 */}
                    <div className="absolute top-2 left-2">
                      {hasVideo
                        ? <Badge className="text-[10px] h-5 px-2 bg-green-500/80 backdrop-blur-sm border-0 text-white gap-1"><Film className="w-2.5 h-2.5" /> 视频已上传</Badge>
                        : <Badge className="text-[10px] h-5 px-2 bg-black/50 backdrop-blur-sm border-white/10 text-white/70 gap-1"><Film className="w-2.5 h-2.5" /> 待上传视频</Badge>
                      }
                    </div>

                    {/* 隐藏 video file input */}
                    <input
                      ref={el => { fileInputRefs.current[style.id] = el; }}
                      type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(style.id, f); }}
                    />
                  </div>

                  {/* 进度条 */}
                  {upload && (
                    <div className="px-4 pt-2 pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        {upload.status === 'uploading' && <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />}
                        {upload.status === 'success' && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
                        {upload.status === 'error' && <AlertCircle className="w-3 h-3 text-destructive shrink-0" />}
                        <span className="text-xs text-muted-foreground truncate">
                          {upload.status === 'uploading' ? `上传中 ${upload.progress}%`
                            : upload.status === 'success' ? '上传成功'
                            : `失败：${upload.message}`}
                        </span>
                      </div>
                      {upload.status === 'uploading' && (
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${upload.progress}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 信息区 */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-3.5 h-3.5 rounded-sm bg-gradient-to-br ${style.color} shrink-0`} />
                      <span className="font-semibold text-sm">{style.label}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">#{style.sort_order}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{style.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {style.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full bg-primary/10 text-primary border-primary/15">{tag}</Badge>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 mt-2">拖拽视频到此卡片可快速上传</p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="px-4 pb-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => fileInputRefs.current[style.id]?.click()}
                      disabled={!!upload && upload.status === 'uploading'}>
                      <Upload className="w-3.5 h-3.5" />
                      {hasVideo ? '重新上传视频' : '上传视频'}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1"
                      onClick={() => setPreviewStyle(toStyleItem(style))}>
                      {hasVideo ? <Play className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      预览
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(style)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* 新增占位卡 */}
          <button
            onClick={() => setAddOpen(true)}
            className="rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors duration-200 flex flex-col items-center justify-center gap-3 aspect-auto min-h-[240px]"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">新增画风</p>
              <p className="text-xs text-muted-foreground mt-0.5">点击添加自定义画风</p>
            </div>
          </button>
        </div>
      )}

      {/* ── 新增画风 Dialog ── */}
      <Dialog open={addOpen} onOpenChange={open => { if (!open) handleCloseAdd(); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增画风</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">画风名称 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="如：复古胶片风"
                  value={form.label}
                  onChange={e => setField('label', e.target.value)}
                  className="px-3"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">
                  画风 ID <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-1">（小写字母/数字/连字符）</span>
                </Label>
                <Input
                  placeholder="如：retro-film"
                  value={form.id}
                  onChange={e => setField('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="px-3 font-mono text-sm"
                  maxLength={32}
                />
              </div>
            </div>

            {/* 描述 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">描述 <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="简短描述该画风的视觉特征，如：复古胶片质感，色调温暖低饱和"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                className="resize-none px-3 text-sm min-h-[70px]"
                maxLength={60}
              />
              <p className="text-[11px] text-muted-foreground text-right">{form.description.length}/60</p>
            </div>

            {/* 标签 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">标签（最多 6 个）</Label>
              <TagInput tags={form.tags} onChange={t => setField('tags', t)} />
            </div>

            {/* 排序 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">排序序号 <span className="text-xs text-muted-foreground">（留 0 自动排在末尾）</span></Label>
              <Input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
                className="px-3 w-28"
              />
            </div>

            {/* 主题色选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-normal">主题色</Label>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${form.color} shrink-0 shadow-sm`} />
                <span className="text-xs text-muted-foreground font-mono">{form.color}</span>
              </div>
              <GradientPicker value={form.color} onChange={c => setField('color', c)} />
            </div>

            {/* 预览图上传 */}
            <div className="space-y-2">
              <Label className="text-sm font-normal">
                预览图 <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground ml-1">（JPG / PNG / WebP，≤ {MAX_IMAGE_MB}MB）</span>
              </Label>

              <div
                className={[
                  'relative border-2 border-dashed rounded-xl overflow-hidden transition-colors duration-200',
                  form.previewPreview ? 'border-primary/40' : 'border-border/60 hover:border-primary/40',
                ].join(' ')}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handlePreviewImage(e.dataTransfer.files?.[0] ?? null); }}
              >
                {form.previewPreview ? (
                  <div className="relative aspect-video">
                    <img src={form.previewPreview} alt="预览图" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button type="button" onClick={() => previewImgRef.current?.click()}
                        className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                        <Upload className="w-4 h-4 text-white" />
                      </button>
                      <button type="button" onClick={() => setForm(p => ({ ...p, previewFile: null, previewPreview: '' }))}
                        className="w-9 h-9 rounded-full bg-red-500/25 hover:bg-red-500/50 backdrop-blur-sm flex items-center justify-center ring-1 ring-red-400/30">
                        <Trash2 className="w-4 h-4 text-red-300" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => previewImgRef.current?.click()}
                    className="w-full aspect-video flex flex-col items-center justify-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-primary/70" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">点击选择或拖拽图片</p>
                      <p className="text-xs text-muted-foreground mt-0.5">建议尺寸 16:9，如 1280×720</p>
                    </div>
                  </button>
                )}
              </div>

              <input
                ref={previewImgRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handlePreviewImage(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={handleCloseAdd} disabled={saving}>取消</Button>
            <Button onClick={handleAddStyle} disabled={saving} className="gap-1.5 min-w-[80px]">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? '保存中…' : '确认新增'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 删除确认 Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除画风</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除画风「{deleteTarget?.label}」吗？该操作将同时删除对应的预览图和演示视频，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteStyle}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {deleting ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 预览 Dialog */}
      <StylePreviewDialog style={previewStyle} onClose={() => setPreviewStyle(null)} />
    </div>
  );
}
