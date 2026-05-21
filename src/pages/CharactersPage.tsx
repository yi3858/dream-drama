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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── 类型 ─────────────────────────────────────────────
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

interface CharacterForm {
  name: string;
  description: string;
  tags: string[];
  is_public: boolean;
  avatarFile: File | null;
  avatarPreview: string;
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
  character, isMine, onEdit, onDelete, onTogglePublic, onCollect, collected,
}: {
  character: Character;
  isMine: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
  onCollect?: () => void;
  collected?: boolean;
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
            {character.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {character.tags.slice(0, 4).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full bg-primary/10 text-primary border-primary/15">{tag}</Badge>
                ))}
              </div>
            )}
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
            <Button variant="outline" size="sm"
              className={`flex-1 h-7 text-xs gap-1.5 ${collected ? 'text-primary border-primary/40 bg-primary/5' : ''}`}
              onClick={onCollect}>
              {collected ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
              {collected ? '已收藏' : '收藏到角色库'}
            </Button>
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
  const avatarRef = useRef<HTMLInputElement | null>(null);

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
    if (!file.type.startsWith('image/')) { toast.error('请上传图片文件'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('头像不能超过 3MB'); return; }
    const url = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, avatarFile: file, avatarPreview: url }));
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

    // 上传头像
    if (form.avatarFile) {
      const ext = form.avatarFile.name.split('.').pop() ?? 'jpg';
      const path = `avatars/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, form.avatarFile, { cacheControl: '3600', upsert: false });
      if (upErr) { toast.error('头像上传失败：' + upErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
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
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑角色' : '新增角色'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {/* 头像 */}
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => avatarRef.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 flex items-center justify-center overflow-hidden shrink-0 transition-colors"
            >
              {form.avatarPreview
                ? <img src={form.avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                : <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
              }
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">角色头像（可选）</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG / PNG / WebP，≤3MB，建议正方形</p>
              {form.avatarPreview && (
                <button type="button" onClick={() => setForm(p => ({ ...p, avatarFile: null, avatarPreview: '' }))}
                  className="text-xs text-destructive mt-1 hover:underline">移除头像</button>
              )}
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
  );
}

// ─── 主页面 ───────────────────────────────────────────
export default function CharactersPage() {
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
            <h1 className="text-2xl font-bold">角色库</h1>
            <p className="text-sm text-muted-foreground mt-1">
              保存创作常用角色，创作时一键选取，无需重复填写
            </p>
          </div>
          <Button onClick={() => { setEditTarget(undefined); setFormOpen(true); }} className="gap-1.5 self-start">
            <Plus className="w-4 h-4" /> 新增角色
          </Button>
        </div>

        <Tabs defaultValue="mine">
          <TabsList className="mb-6">
            <TabsTrigger value="mine">个人角色库 ({myChars.length})</TabsTrigger>
            <TabsTrigger value="public">公共角色库 ({pubTotal})</TabsTrigger>
          </TabsList>

          {/* ── 个人角色库 ── */}
          <TabsContent value="mine">
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
    </div>
  );
}
