import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, User, Check, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── 类型（与创作页面 Character 对齐） ───────────────
export interface CharacterPickerResult {
  name: string;
  description: string;
}

interface Character {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  tags: string[];
  is_public: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 回调：选中并点击「使用」后触发，可批量传多个 */
  onSelect: (chars: CharacterPickerResult[]) => void;
}

export default function CharacterPickerDialog({ open, onClose, onSelect }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadChars = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('characters')
      .select('id, name, description, avatar_url, tags, is_public')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    const { data } = await query;
    setChars(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [user, search]);

  useEffect(() => {
    if (open) { setSelected(new Set()); loadChars(); }
  }, [open, loadChars]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const picked = chars
      .filter(c => selected.has(c.id))
      .map(c => ({ name: c.name, description: c.description }));
    if (picked.length === 0) { toast.error('请至少选择一个角色'); return; }
    onSelect(picked);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>从角色库选取</DialogTitle>
        </DialogHeader>

        {/* 搜索 */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索角色名称…" className="pl-9 px-3 h-9" />
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-1 pr-0.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-border/50">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : chars.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <User className="w-10 h-10 text-muted-foreground/30" />
              {search ? (
                <p className="text-sm text-muted-foreground">未找到「{search}」相关角色</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">角色库为空，先去创建角色吧</p>
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => { onClose(); navigate('/characters'); }}>
                    <Plus className="w-3.5 h-3.5" /> 去创建角色
                  </Button>
                </>
              )}
            </div>
          ) : (
            chars.map(char => {
              const isSelected = selected.has(char.id);
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => toggle(char.id)}
                  className={[
                    'w-full flex gap-3 items-start p-3 rounded-lg border text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                      : 'border-border/50 hover:border-primary/40 hover:bg-muted/40',
                  ].join(' ')}
                >
                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border/50 relative">
                    {char.avatar_url
                      ? <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                      : <User className="w-5 h-5 text-muted-foreground/40" />
                    }
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{char.name}</span>
                      {char.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary"
                          className="text-[10px] h-4 px-1.5 rounded-full bg-primary/10 text-primary border-primary/15">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 text-pretty">
                      {char.description || '暂无描述'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 shrink-0">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0 ? `已选 ${selected.size} 个角色` : '点击选择角色（可多选）'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleConfirm} disabled={selected.size === 0}
              className="gap-1.5 min-w-[70px]">
              <Check className="w-3.5 h-3.5" />
              使用 {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
