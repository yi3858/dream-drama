import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus, Search, User, Pencil, Trash2, Globe, Lock,
  Loader2, X, ImageIcon, Bookmark, BookmarkCheck,
  Upload, Sparkles, RefreshCw, FileImage, Wand2,
  CheckCircle2, AlertCircle, Images, Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CharacterDetailDialog from '@/components/characters/CharacterDetailDialog';

// ─── 类型 ─────────────────────────────────────────────
interface Character {
  id: string;
  user_id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  tags: string[];
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

interface CharacterForm {
  name: string;
  description: string;
  tags: string[];
  is_public: boolean;
  avatarFile: File | null;
  avatarPreview: string;
}

// 批量上传条目
type BatchStatus = 'pending' | 'creating' | 'done' | 'error';
interface BatchItem {
  id: string;
  file: File;
  preview: string;
  name: string;
  status: BatchStatus;
  error?: string;
}

const EMPTY_FORM: CharacterForm = {
  name: '', description: '', tags: [], is_public: false,
  avatarFile: null, avatarPreview: '',
};

const PAGE_SIZE = 20;
const BUCKET = 'character-assets';

// ─── 标签输入 ─────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v || tags.includes(v) || tags.length >= 5) return;
    onChange([...tags, v]);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="输入后按 Enter（最多5个）" className="h-8 text-sm px-3" maxLength={12} />
        <Button type="button" variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary"
              className="text-xs bg-primary/10 text-primary border-primary/20 rounded-full pl-2.5 pr-1.5 gap-1">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}
                className="w-3.5 h-3.5 rounded-full hover:bg-primary/20 flex items-center justify-center">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 角色卡片（通用） ──────────────────────────────────
function CharacterCard({
  character, isMine, onEdit, onDelete, onTogglePublic, onCollect, collected, onDetail,
}: {
  character: Character;
  isMine: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
  onCollect?: () => void;
  collected?: boolean;
  onDetail?: () => void;
}) {
  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-colors h-full flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* 头部：头像 + 基本信息 */}
        <div className="flex gap-3 items-start">
          <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/50">
            {character.avatar_url
              ? <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
              : <User className="w-6 h-6 text-muted-foreground/40" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm truncate">{character.name}</span>
              {isMine && (
                character.is_public
                  ? <Badge className="text-[10px] h-4 px-1.5 bg-green-500/15 text-green-400 border-green-500/20 rounded-full gap-0.5 shrink-0"><Globe className="w-2.5 h-2.5" />公开</Badge>
                  : <Badge className="text-[10px] h-4 px-1.5 bg-muted text-muted-foreground border-border/50 rounded-full gap-0.5 shrink-0"><Lock className="w-2.5 h-2.5" />私有</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {character.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full bg-primary/10 text-primary border-primary/15">{tag}</Badge>
              ))}
              {/* 创作次数角标 */}
              {character.usage_count > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <Wand2 className="w-2.5 h-2.5" /> 已用于 {character.usage_count} 次创作
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 描述 */}
        <p className="text-xs text-muted-foreground line-clamp-3 flex-1 text-pretty">{character.description || '暂无描述'}</p>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-auto pt-1 border-t border-border/40">
          {isMine ? (
            <>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={onEdit}>
                <Pencil className="w-3 h-3" />编辑
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={onDetail} title="查看详情">
                <Info className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={onTogglePublic}
                title={character.is_public ? '设为私有' : '设为公开'}>
                {character.is_public ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              </Button>
              <Button variant="outline" size="sm"
                className="h-7 px-2.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={onDelete}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={onDetail} title="查看详情">
                <Info className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm"
                className={`flex-1 h-7 text-xs gap-1.5 ${collected ? 'text-primary border-primary/40 bg-primary/5' : ''}`}
                onClick={onCollect}>
                {collected ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                {collected ? '已收藏' : '收藏到角色库'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 角色卡片骨架屏 ────────────────────────────────────
function CharacterSkeleton() {
  return (
    <Card>
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
        <Skeleton className="h-7 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

// ─── AI 智能创建 Dialog ────────────────────────────────
function AiGenerateDialog({
  open, onClose, onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (data: { name: string; description: string; tags: string[]; avatar_url: string | null }) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [withAvatar, setWithAvatar] = useState(true);
  const [result, setResult] = useState<{
    name: string; description: string; tags: string[]; avatar_url: string | null;
  } | null>(null);

  // 参考图
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState('');
  const refInputRef = useRef<HTMLInputElement | null>(null);

  const handleRefFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('请上传图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('参考图不能超过 5MB'); return; }
    if (refPreview) URL.revokeObjectURL(refPreview);
    setRefFile(file);
    setRefPreview(URL.createObjectURL(file));
  };

  const removeRef = () => {
    if (refPreview) URL.revokeObjectURL(refPreview);
    setRefFile(null);
    setRefPreview('');
  };

  // 将 File 转换为纯 base64 字符串
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 去掉 "data:image/xxx;base64," 前缀
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleGenerate = async () => {
    if (!keyword.trim()) { toast.error('请输入角色关键词'); return; }
    setLoading(true);
    setResult(null);
    try {
      // 如有参考图，转为 base64
      let referenceImageBase64: string | undefined;
      let referenceImageMime: string | undefined;
      if (refFile && withAvatar) {
        referenceImageBase64 = await fileToBase64(refFile);
        referenceImageMime = refFile.type;
      }

      const { data, error } = await supabase.functions.invoke('generate-character', {
        body: {
          keyword: keyword.trim(),
          includeAvatar: withAvatar,
          referenceImageBase64,
          referenceImageMime,
        },
      });
      if (error) {
        const msg = await error?.context?.text?.() ?? error.message;
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success('AI 生成完成！可以继续修改或直接应用');
    } catch (e) {
      toast.error('生成失败：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setResult(null);
    setKeyword('');
    removeRef();
  };

  const handleClose = () => {
    if (loading) return;
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI 智能创建角色
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 关键词输入 */}
          <div className="space-y-1.5">
            <Label className="text-sm font-normal">角色关键词 <span className="text-destructive">*</span></Label>
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
              placeholder="例如：冷酷刺客、温柔治愈系少女、机甲战士…"
              className="px-3"
              disabled={loading}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">输入角色名称或性格关键词，AI 将自动生成完整角色资料</p>
          </div>

          {/* 是否生成头像 */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/40">
            <div className="space-y-0.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> 同时生成头像
              </p>
              <p className="text-xs text-muted-foreground">使用 AI 绘图生成角色头像（约需 30-60 秒）</p>
            </div>
            <Switch checked={withAvatar} onCheckedChange={setWithAvatar} disabled={loading} />
          </div>

          {/* 参考图上传（仅 withAvatar 时显示） */}
          {withAvatar && (
            <div className="space-y-2">
              <Label className="text-sm font-normal flex items-center gap-1.5">
                <FileImage className="w-3.5 h-3.5" /> 参考图（可选）
              </Label>
              <p className="text-xs text-muted-foreground -mt-1">上传参考图片，AI 将参考其风格或相貌生成头像</p>

              {refPreview ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20">
                  <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-border/30">
                    <img src={refPreview} alt="参考图" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{refFile?.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {refFile ? (refFile.size / 1024).toFixed(0) + ' KB' : ''}
                    </p>
                    <button type="button" onClick={removeRef}
                      className="text-[11px] text-destructive hover:underline mt-1 flex items-center gap-0.5">
                      <X className="w-3 h-3" /> 移除参考图
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => refInputRef.current?.click()}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileImage className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">点击上传参考图片</p>
                    <p className="text-[11px] text-muted-foreground/70">JPG / PNG / WebP，≤5MB</p>
                  </div>
                </button>
              )}
              <input
                ref={refInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleRefFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {/* 生成按钮 */}
          <Button
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={loading || !keyword.trim()}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 生成中{withAvatar ? '（含头像，约需1分钟）' : ''}…</>
              : <><Sparkles className="w-4 h-4" /> 开始 AI 生成</>
            }
          </Button>

          {/* 生成结果预览 */}
          {result && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 生成结果预览
              </p>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-border/50 overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                  {result.avatar_url
                    ? <img src={result.avatar_url} alt="AI头像" className="w-full h-full object-cover" />
                    : <User className="w-6 h-6 text-muted-foreground/40" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{result.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.tags.map(tag => (
                      <Badge key={tag} variant="secondary"
                        className="text-[10px] h-4 px-1.5 rounded-full bg-primary/10 text-primary border-primary/15">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{result.description}</p>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleGenerate} disabled={loading}>
                  <RefreshCw className="w-3.5 h-3.5" /> 重新生成
                </Button>
                <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleApply}>
                  <Sparkles className="w-3.5 h-3.5" /> 应用到表单
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-1">
          <Button variant="outline" onClick={handleClose} disabled={loading}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 批量上传 Dialog ───────────────────────────────────
function BatchUploadDialog({
  open, onClose, onDone, userId,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (chars: Character[]) => void;
  userId: string;
}) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) { toast.error('请选择图片文件（JPG/PNG/WebP）'); return; }
    const oversized = arr.filter(f => f.size > 3 * 1024 * 1024);
    if (oversized.length) { toast.warning(`${oversized.length} 张图片超过 3MB 已跳过`); }
    const valid = arr.filter(f => f.size <= 3 * 1024 * 1024);
    const newItems: BatchItem[] = valid.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name.replace(/\.[^/.]+$/, '').slice(0, 20),
      status: 'pending',
    }));
    setItems(prev => {
      const combined = [...prev, ...newItems];
      if (combined.length > 20) {
        toast.warning('最多批量上传 20 张，多余已截断');
        return combined.slice(0, 20);
      }
      return combined;
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(x => x.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const updateName = (id: string, name: string) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, name } : x));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleCreate = async () => {
    const pending = items.filter(x => x.status === 'pending');
    if (!pending.length) { toast.error('没有待创建的角色'); return; }
    setRunning(true);
    setDoneCount(0);
    const created: Character[] = [];

    for (const item of pending) {
      // 标记 creating
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'creating' } : x));

      try {
        // 上传头像到 Storage
        const ext = item.file.name.split('.').pop() ?? 'jpg';
        const path = `avatars/${userId}_batch_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('character-assets')
          .upload(path, item.file, { cacheControl: '3600', upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data: urlData } = supabase.storage.from('character-assets').getPublicUrl(path);

        // 写入数据库
        const { data, error: insErr } = await supabase.from('characters').insert({
          user_id: userId,
          name: item.name || item.file.name.replace(/\.[^/.]+$/, '').slice(0, 20),
          description: '',
          tags: [],
          is_public: false,
          avatar_url: urlData.publicUrl,
        }).select().maybeSingle();
        if (insErr) throw new Error(insErr.message);
        if (data) created.push(data as Character);

        setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'done' } : x));
        setDoneCount(n => n + 1);
      } catch (e) {
        setItems(prev => prev.map(x =>
          x.id === item.id ? { ...x, status: 'error', error: (e as Error).message } : x
        ));
        setDoneCount(n => n + 1);
      }
    }

    setRunning(false);
    if (created.length) {
      toast.success(`成功创建 ${created.length} 个角色`);
      onDone(created);
    }
  };

  const handleClose = () => {
    if (running) return;
    // 清理 blob URL
    items.forEach(x => { if (x.preview) URL.revokeObjectURL(x.preview); });
    setItems([]);
    setDoneCount(0);
    onClose();
  };

  const pendingCount = items.filter(x => x.status === 'pending').length;
  const doneItems = items.filter(x => x.status === 'done').length;
  const errorItems = items.filter(x => x.status === 'error').length;
  const progress = running ? Math.round((doneCount / items.filter(x => x.status !== 'pending' || running).length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="w-4 h-4 text-primary" />
            批量上传创建角色
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 拖拽上传区 */}
          {!running && (
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                dragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border/60 hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">点击或拖拽图片到此处</p>
                <p className="text-xs text-muted-foreground mt-1">支持 JPG / PNG / WebP，每张 ≤3MB，最多 20 张</p>
                <p className="text-xs text-muted-foreground">每张图片将自动以文件名命名，可在下方修改</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />

          {/* 进度条（运行中） */}
          {running && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>正在创建角色…</span>
                <span>{doneCount} / {items.length}</span>
              </div>
              <Progress value={Math.round((doneCount / items.length) * 100)} className="h-2" />
            </div>
          )}

          {/* 图片预览网格 */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  已选择 {items.length} 张图片
                  {doneItems > 0 && <span className="text-green-500 ml-1.5">（{doneItems} 已完成）</span>}
                  {errorItems > 0 && <span className="text-destructive ml-1.5">（{errorItems} 失败）</span>}
                </p>
                {!running && pendingCount > 0 && (
                  <button type="button" onClick={() => {
                    items.forEach(x => { if (x.preview) URL.revokeObjectURL(x.preview); });
                    setItems([]);
                  }} className="text-xs text-muted-foreground hover:text-destructive">清空全部</button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className={`relative rounded-xl border overflow-hidden transition-all ${
                    item.status === 'done' ? 'border-green-500/40 bg-green-500/5' :
                    item.status === 'error' ? 'border-destructive/40 bg-destructive/5' :
                    item.status === 'creating' ? 'border-primary/40 bg-primary/5' :
                    'border-border/50'
                  }`}>
                    {/* 图片预览 */}
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                    </div>

                    {/* 状态角标 */}
                    <div className="absolute top-1.5 right-1.5">
                      {item.status === 'creating' && (
                        <div className="w-5 h-5 rounded-full bg-background/90 flex items-center justify-center">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        </div>
                      )}
                      {item.status === 'done' && (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                          <AlertCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* 删除按钮（仅 pending 状态） */}
                    {item.status === 'pending' && !running && (
                      <button type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-background/90 hover:bg-destructive/90 flex items-center justify-center transition-colors group">
                        <X className="w-3 h-3 text-muted-foreground group-hover:text-white" />
                      </button>
                    )}

                    {/* 名称编辑 */}
                    <div className="p-1.5">
                      {item.status === 'pending' && !running ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateName(item.id, e.target.value.slice(0, 20))}
                          className="w-full text-[11px] bg-transparent border-0 outline-none focus:outline-none px-1 py-0.5 rounded border border-transparent focus:border-border/50 text-center"
                          placeholder="角色名称"
                        />
                      ) : (
                        <p className={`text-[11px] text-center truncate px-1 ${
                          item.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {item.status === 'error' ? '创建失败' : item.name || '未命名'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空状态提示 */}
          {items.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              选择图片后，每张图片将创建一个独立角色
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={running}>
            {doneItems > 0 && !running ? '完成' : '取消'}
          </Button>
          {pendingCount > 0 && !running && (
            <Button onClick={handleCreate} className="gap-1.5 min-w-[120px]">
              <Upload className="w-3.5 h-3.5" />
              批量创建 {pendingCount} 个角色
            </Button>
          )}
          {running && (
            <Button onClick={() => {}} disabled className="gap-1.5 min-w-[120px]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 创建中…
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 新增/编辑 Dialog ──────────────────────────────────
function CharacterFormDialog({
  open, onClose, initial, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Character;
  onSaved: (c: Character) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<CharacterForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const avatarRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name, description: initial.description,
        tags: initial.tags, is_public: initial.is_public,
        avatarFile: null, avatarPreview: initial.avatar_url ?? '',
      } : EMPTY_FORM);
    }
  }, [open, initial]);

  const setField = <K extends keyof CharacterForm>(k: K, v: CharacterForm[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('请上传图片文件（JPG/PNG/WebP）'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('头像不能超过 3MB'); return; }
    const url = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, avatarFile: file, avatarPreview: url }));
  };

  // 拖拽事件
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleAvatarFile(file);
  };

  // 应用 AI 生成结果
  const handleApplyAi = (data: { name: string; description: string; tags: string[]; avatar_url: string | null }) => {
    setForm(prev => ({
      ...prev,
      name: data.name || prev.name,
      description: data.description || prev.description,
      tags: data.tags.length ? data.tags : prev.tags,
      avatarFile: null,
      avatarPreview: data.avatar_url || prev.avatarPreview,
    }));
    toast.success('AI 生成结果已填入表单，可继续修改');
  };

  const handleClose = () => {
    if (form.avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(form.avatarPreview);
    onClose();
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('请填写角色名称'); return; }
    if (!form.description.trim()) { toast.error('请填写角色描述'); return; }
    if (!user) { toast.error('请先登录'); return; }
    setSaving(true);

    let avatarUrl = initial?.avatar_url ?? null;

    // 上传本地头像文件
    if (form.avatarFile) {
      const ext = form.avatarFile.name.split('.').pop() ?? 'jpg';
      const path = `avatars/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, form.avatarFile, { cacheControl: '3600', upsert: false });
      if (upErr) { toast.error('头像上传失败：' + upErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    } else if (form.avatarPreview && !form.avatarPreview.startsWith('blob:')) {
      // 保留 AI 生成的 URL（已存储在 Storage 中）
      avatarUrl = form.avatarPreview;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      tags: form.tags,
      is_public: form.is_public,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    let result: Character | null = null;
    if (initial) {
      const { data, error } = await supabase.from('characters')
        .update(payload).eq('id', initial.id).select().maybeSingle();
      if (error) { toast.error('保存失败：' + error.message); setSaving(false); return; }
      result = data;
    } else {
      const { data, error } = await supabase.from('characters')
        .insert({ ...payload, user_id: user.id }).select().maybeSingle();
      if (error) { toast.error('新增失败：' + error.message); setSaving(false); return; }
      result = data;
    }

    setSaving(false);
    if (result) {
      toast.success(initial ? '角色已更新' : '角色创建成功');
      onSaved(result);
      handleClose();
    }
  };

  return (
    <>
      <AiGenerateDialog open={aiOpen} onClose={() => setAiOpen(false)} onApply={handleApplyAi} />
      {user && (
        <BatchUploadDialog
          open={batchOpen}
          onClose={() => setBatchOpen(false)}
          userId={user.id}
          onDone={chars => { onSaved(chars[0]); chars.slice(1).forEach(c => onSaved(c)); handleClose(); }}
        />
      )}

      <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{initial ? '编辑角色' : '新增角色'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">

            {/* ── 快捷入口区：本地上传 + AI 创建 + 批量上传 ── */}
            {!initial && (
              <div className="grid grid-cols-3 gap-2">
                {/* 本地上传 */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">本地上传</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">单图</p>
                  </div>
                </button>

                {/* AI 智能创建 */}
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-colors text-center"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary">AI 智能创建</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">自动生成</p>
                  </div>
                </button>

                {/* 批量上传 */}
                <button
                  type="button"
                  onClick={() => setBatchOpen(true)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Images className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">批量上传</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">多图批量</p>
                  </div>
                </button>

                {/* 隐藏的文件选择器（用于"本地上传"按钮，选择角色相关文件） */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    if (file) {
                      handleAvatarFile(file);
                      // 自动设置角色名称为文件名（去除扩展名）
                      const fileName = file.name.replace(/\.[^/.]+$/, '');
                      if (!form.name) setField('name', fileName.slice(0, 20));
                    }
                  }}
                />
              </div>
            )}

            {/* 分割线（仅新增时显示） */}
            {!initial && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">或手动填写</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}

            {/* 头像区（拖拽上传 + 点击上传） */}
            <div className="flex items-center gap-4">
              <div
                ref={dropRef}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => avatarRef.current?.click()}
                className={`w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 transition-colors cursor-pointer ${
                  dragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 hover:border-primary/50 bg-muted/30 hover:bg-muted/50'
                }`}
              >
                {form.avatarPreview
                  ? <img src={form.avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                  : <FileImage className="w-6 h-6 text-muted-foreground/40" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">角色头像（可选）</p>
                <p className="text-xs text-muted-foreground mt-0.5">点击或拖拽图片到左侧，JPG / PNG / WebP，≤3MB</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button type="button" onClick={() => avatarRef.current?.click()}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Upload className="w-3 h-3" /> 本地上传
                  </button>
                  {initial && (
                    <button type="button" onClick={() => setAiOpen(true)}
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI 生成
                    </button>
                  )}
                  {form.avatarPreview && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, avatarFile: null, avatarPreview: '' }))}
                      className="text-xs text-destructive hover:underline">移除</button>
                  )}
                </div>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={e => handleAvatarFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* 名称 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">角色名称 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setField('name', e.target.value)}
                placeholder="主角、反派、配角…" className="px-3" maxLength={20} />
              <p className="text-[11px] text-muted-foreground text-right">{form.name.length}/20</p>
            </div>

            {/* 描述 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">角色描述 <span className="text-destructive">*</span></Label>
              <Textarea value={form.description} onChange={e => setField('description', e.target.value)}
                placeholder="描述角色的外貌、性格、服装、技能等特征，信息越详细 AI 生成越准确…"
                className="resize-none px-3 text-sm min-h-[90px]" maxLength={200} />
              <p className="text-[11px] text-muted-foreground text-right">{form.description.length}/200</p>
            </div>

            {/* 标签 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">标签（最多5个）</Label>
              <TagInput tags={form.tags} onChange={t => setField('tags', t)} />
            </div>

            {/* 公开开关 */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">公开到角色库</p>
                <p className="text-xs text-muted-foreground">公开后其他用户可浏览并收藏</p>
              </div>
              <Switch checked={form.is_public} onCheckedChange={v => setField('is_public', v)} />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>取消</Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[80px] gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {saving ? '保存中…' : (initial ? '保存修改' : '创建角色')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 主页面 ───────────────────────────────────────────
import { useLanguage } from '@/contexts/LanguageContext';

export default function CharactersPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 个人角色库
  const [myChars, setMyChars] = useState<Character[]>([]);
  const [myLoading, setMyLoading] = useState(true);

  // 公共角色库
  const [pubChars, setPubChars] = useState<Character[]>([]);
  const [pubLoading, setPubLoading] = useState(true);
  const [pubSearch, setPubSearch] = useState('');
  const [pubTag, setPubTag] = useState('');
  const [pubPage, setPubPage] = useState(0);
  const [pubTotal, setPubTotal] = useState(0);

  // 收藏 ID 集合（已在自己角色库中的同名 + 描述角色）
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());

  // 编辑/新增 Dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Character | undefined>();

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 角色详情 Dialog
  const [detailChar, setDetailChar] = useState<Character | null>(null);
  const [detailIsMine, setDetailIsMine] = useState(false);

  // AI 批量补全
  const [autofilling, setAutofilling] = useState(false);

  // 所有公共标签（用于筛选）
  const [allPubTags, setAllPubTags] = useState<string[]>([]);

  // ── 加载个人角色 ──
  const loadMyChars = useCallback(async () => {
    if (!user) return;
    setMyLoading(true);
    const { data } = await supabase
      .from('characters').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyChars(Array.isArray(data) ? data : []);
    setMyLoading(false);
  }, [user]);

  // ── 加载公共角色 ──
  const loadPubChars = useCallback(async () => {
    setPubLoading(true);
    let query = supabase.from('characters').select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(pubPage * PAGE_SIZE, (pubPage + 1) * PAGE_SIZE - 1);
    if (pubSearch.trim()) query = query.ilike('name', `%${pubSearch.trim()}%`);
    if (pubTag) query = query.contains('tags', [pubTag]);

    const { data, count } = await query;
    setPubChars(Array.isArray(data) ? data : []);
    setPubTotal(count ?? 0);
    setPubLoading(false);
  }, [pubPage, pubSearch, pubTag]);

  // 加载公共标签列表（用于筛选器）
  const loadPubTags = useCallback(async () => {
    const { data } = await supabase.from('characters')
      .select('tags').eq('is_public', true);
    if (!data) return;
    const set = new Set<string>();
    data.forEach(r => r.tags?.forEach((t: string) => set.add(t)));
    setAllPubTags([...set].slice(0, 20));
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadMyChars();
    loadPubTags();
  }, [user, loadMyChars, loadPubTags, navigate]);

  useEffect(() => { loadPubChars(); }, [loadPubChars]);

  // 更新收藏集合（已拥有的公开角色名单）
  useEffect(() => {
    setCollectedIds(new Set(myChars.filter(c => !c.is_public || c.user_id === user?.id).map(c => c.id)));
  }, [myChars, user]);

  // ── 删除角色 ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    if (deleteTarget.avatar_url) {
      try {
        const old = new URL(deleteTarget.avatar_url).pathname.split(`/${BUCKET}/`)[1];
        if (old) await supabase.storage.from(BUCKET).remove([old]);
      } catch { /* ignore */ }
    }
    const { error } = await supabase.from('characters').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error('删除失败：' + error.message); return; }
    setMyChars(prev => prev.filter(c => c.id !== deleteTarget.id));
    toast.success(`「${deleteTarget.name}」已删除`);
    setDeleteTarget(null);
  };

  // ── 切换公开/私有 ──
  const handleTogglePublic = async (char: Character) => {
    const { data, error } = await supabase.from('characters')
      .update({ is_public: !char.is_public, updated_at: new Date().toISOString() })
      .eq('id', char.id).select().maybeSingle();
    if (error) { toast.error('操作失败：' + error.message); return; }
    if (data) {
      setMyChars(prev => prev.map(c => c.id === char.id ? data : c));
      toast.success(data.is_public ? `「${char.name}」已设为公开` : `「${char.name}」已设为私有`);
      loadPubTags();
    }
  };

  // ── 收藏公共角色 ──
  const handleCollect = async (char: Character) => {
    if (!user) { toast.error('请先登录'); return; }
    if (collectedIds.has(char.id)) { toast.info('该角色已在你的角色库中'); return; }
    const { data, error } = await supabase.from('characters').insert({
      user_id: user.id,
      name: char.name,
      description: char.description,
      avatar_url: char.avatar_url,
      tags: char.tags,
      is_public: false,
    }).select().maybeSingle();
    if (error) { toast.error('收藏失败：' + error.message); return; }
    if (data) {
      setMyChars(prev => [data, ...prev]);
      setCollectedIds(prev => new Set([...prev, char.id]));
      toast.success(`「${char.name}」已收藏到个人角色库`);
    }
  };

  // ── AI 批量补全描述 & 标签 ──
  const handleAutofill = async () => {
    const incomplete = myChars.filter(c => !c.description?.trim() || !c.tags?.length);
    if (!incomplete.length) { toast.info('所有角色均已有描述和标签'); return; }
    setAutofilling(true);
    let done = 0;

    for (const char of incomplete) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-character', {
          body: { keyword: char.name, includeAvatar: false },
        });
        if (error || !data) continue;

        const newDesc = char.description?.trim() ? char.description : (data.description ?? '');
        const newTags = char.tags?.length ? char.tags : (Array.isArray(data.tags) ? data.tags.slice(0, 5) : []);

        const { data: updated } = await supabase.from('characters')
          .update({ description: newDesc, tags: newTags, updated_at: new Date().toISOString() })
          .eq('id', char.id).select().maybeSingle();
        if (updated) {
          setMyChars(prev => prev.map(c => c.id === char.id ? (updated as Character) : c));
          done++;
        }
      } catch { /* 单条失败跳过 */ }
    }

    setAutofilling(false);
    if (done > 0) toast.success(`AI 已补全 ${done} 个角色的描述和标签`);
    else toast.error('补全失败，请稍后重试');
  };

  // ── 保存后刷新 ──
  const handleSaved = (c: Character) => {
    setMyChars(prev => {
      const idx = prev.findIndex(x => x.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [c, ...prev];
    });
  };

  const totalPages = Math.ceil(pubTotal / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 页头 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">{t('characters_title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('characters_desc')}
            </p>
          </div>
          <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }} className="gap-1.5 self-start">
            <Plus className="w-4 h-4" /> {language === 'zh' ? '新增角色' : 'Add Character'}
          </Button>
        </div>

        <Tabs defaultValue="mine">
          <TabsList className="mb-6">
            <TabsTrigger value="mine">{language === 'zh' ? '个人角色库' : (language === 'en' ? 'My Characters' : 'ตัวละครส่วนตัว')} ({myChars.length})</TabsTrigger>
            <TabsTrigger value="public">{language === 'zh' ? '公共角色库' : (language === 'en' ? 'Public Characters' : 'ตัวละครสาธารณะ')} ({pubTotal})</TabsTrigger>
          </TabsList>

          {/* ── 个人角色库 ── */}
          <TabsContent value="mine">
            {/* AI 批量补全 Banner */}
            {!myLoading && (() => {
              const incompleteCount = myChars.filter(c => !c.description?.trim() || !c.tags?.length).length;
              return incompleteCount > 0 ? (
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl border border-primary/25 bg-primary/5">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm flex-1 min-w-0 text-pretty">
                    <span className="font-semibold text-primary">{incompleteCount} 个角色</span>
                    {' '}缺少描述或标签，AI 可以自动补全
                  </p>
                  <Button size="sm" className="gap-1.5 shrink-0 h-8" onClick={handleAutofill} disabled={autofilling}>
                    {autofilling
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Sparkles className="w-3.5 h-3.5" />
                    }
                    {autofilling ? '补全中…' : 'AI 一键补全'}
                  </Button>
                </div>
              ) : null;
            })()}
            {myLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CharacterSkeleton key={i} />)}
              </div>
            ) : myChars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="font-medium">暂无角色</p>
                  <p className="text-sm text-muted-foreground mt-1">创建角色后，可在创作时直接选用</p>
                </div>
                <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }} className="gap-1.5">
                  <Plus className="w-4 h-4" /> 创建第一个角色
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myChars.map(c => (
                  <CharacterCard key={c.id} character={c} isMine
                    onEdit={() => { setEditTarget(c); setFormOpen(true); }}
                    onDelete={() => setDeleteTarget(c)}
                    onTogglePublic={() => handleTogglePublic(c)}
                    onDetail={() => { setDetailChar(c); setDetailIsMine(true); }}
                  />
                ))}
                {/* 新增占位 */}
                <button onClick={() => { setEditTarget(undefined); setFormOpen(true); }}
                  className="rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3 min-h-[160px]">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">新增角色</p>
                </button>
              </div>
            )}
          </TabsContent>

          {/* ── 公共角色库 ── */}
          <TabsContent value="public">
            {/* 搜索 + 标签筛选 */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={pubSearch} onChange={e => { setPubSearch(e.target.value); setPubPage(0); }}
                  placeholder="搜索角色名称…" className="pl-9 px-3 h-9" />
              </div>
              {allPubTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 md:max-w-sm">
                  <button
                    onClick={() => { setPubTag(''); setPubPage(0); }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!pubTag ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 hover:border-primary/40 text-muted-foreground'}`}
                  >全部</button>
                  {allPubTags.map(tag => (
                    <button key={tag}
                      onClick={() => { setPubTag(tag === pubTag ? '' : tag); setPubPage(0); }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${pubTag === tag ? 'bg-primary text-primary-foreground border-primary' : 'border-border/60 hover:border-primary/40 text-muted-foreground'}`}
                    >{tag}</button>
                  ))}
                </div>
              )}
            </div>

            {pubLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CharacterSkeleton key={i} />)}
              </div>
            ) : pubChars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Globe className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">暂无公开角色{pubSearch ? `「${pubSearch}」` : ''}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pubChars.map(c => (
                  <CharacterCard key={c.id} character={c} isMine={false}
                    onCollect={() => handleCollect(c)}
                    collected={collectedIds.has(c.id)}
                    onDetail={() => { setDetailChar(c); setDetailIsMine(false); }}
                  />
                ))}
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="sm" disabled={pubPage === 0} onClick={() => setPubPage(p => p - 1)}>上一页</Button>
                <span className="text-sm text-muted-foreground">{pubPage + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={pubPage >= totalPages - 1} onClick={() => setPubPage(p => p + 1)}>下一页</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 新增/编辑 Dialog */}
      <CharacterFormDialog
        open={formOpen} onClose={() => setFormOpen(false)}
        initial={editTarget} onSaved={handleSaved}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除角色「{deleteTarget?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {deleting ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 角色详情 Dialog */}
      <CharacterDetailDialog
        character={detailChar}
        open={!!detailChar}
        onClose={() => setDetailChar(null)}
        isMine={detailIsMine}
        onCollect={detailChar ? () => handleCollect(detailChar) : undefined}
        collected={detailChar ? collectedIds.has(detailChar.id) : false}
      />
    </div>
  );
}
