import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/db/supabase';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  User, Globe, Lock, Wand2, Bookmark, BookmarkCheck,
  Download, Loader2, Sparkles,
} from 'lucide-react';

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

interface Props {
  character: Character | null;
  open: boolean;
  onClose: () => void;
  isMine: boolean;
  onCollect?: () => void;
  collected?: boolean;
}

// ─── Canvas 导出工具函数 ──────────────────────────────
async function exportCharacterCard(character: Character): Promise<void> {
  const W = 600;
  const H = 380;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;   // 2× 高清
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);

  // ── 背景渐变 ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f0c29');
  bg.addColorStop(0.5, '#302b63');
  bg.addColorStop(1, '#24243e');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // ── 装饰光晕 ──
  const glow = ctx.createRadialGradient(W * 0.15, H * 0.3, 0, W * 0.15, H * 0.3, 140);
  glow.addColorStop(0, 'rgba(139,92,246,0.25)');
  glow.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── 头像（圆形） ──
  const avatarX = 52;
  const avatarY = 52;
  const avatarR = 44;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  ctx.clip();

  if (character.avatar_url) {
    try {
      const img = await loadImage(character.avatar_url);
      ctx.drawImage(img, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    } catch {
      drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarR);
    }
  } else {
    drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarR);
  }
  ctx.restore();

  // 头像边框
  ctx.strokeStyle = 'rgba(139,92,246,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 1, 0, Math.PI * 2);
  ctx.stroke();

  // ── 角色名称 ──
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(character.name, 114, 46);

  // ── 创作次数 ──
  if (character.usage_count > 0) {
    ctx.fillStyle = 'rgba(167,139,250,0.9)';
    ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`✦ 已用于 ${character.usage_count} 次创作`, 116, 66);
  }

  // ── 标签 ──
  let tagX = 114;
  const tagY = 84;
  for (const tag of character.tags.slice(0, 5)) {
    const tw = ctx.measureText(tag).width + 18;
    ctx.fillStyle = 'rgba(139,92,246,0.3)';
    roundRect(ctx, tagX, tagY - 12, tw, 20, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(139,92,246,0.5)';
    ctx.lineWidth = 0.8;
    roundRect(ctx, tagX, tagY - 12, tw, 20, 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(216,180,254,0.95)';
    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(tag, tagX + 9, tagY + 3);
    tagX += tw + 6;
    if (tagX > W - 30) break;
  }

  // ── 分割线 ──
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 120);
  ctx.lineTo(W - 28, 120);
  ctx.stroke();

  // ── 描述文字（自动换行） ──
  ctx.fillStyle = 'rgba(203,213,225,0.9)';
  ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
  wrapText(ctx, character.description || '暂无描述', 28, 145, W - 56, 20, 8);

  // ── 底部品牌标识 ──
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('AI 漫剧制作平台', W - 24, H - 16);
  ctx.textAlign = 'left';

  // ── 下载 ──
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `角色卡_${character.name}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// ── Canvas 工具函数 ────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawAvatarPlaceholder(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number
) {
  ctx.fillStyle = 'rgba(139,92,246,0.3)';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `${r}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👤', cx, cy + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxW: number, lineH: number, maxLines: number
) {
  const words = text.split('');
  let line = '';
  let lineCount = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i];
    if (ctx.measureText(test).width > maxW) {
      if (lineCount >= maxLines - 1) {
        ctx.fillText(line + '…', x, y + lineCount * lineH);
        return;
      }
      ctx.fillText(line, x, y + lineCount * lineH);
      line = words[i];
      lineCount++;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + lineCount * lineH);
}

// ─── 相似角色卡 ───────────────────────────────────────
function SimilarCard({
  character, onCollect, collected,
}: {
  character: Character; onCollect: () => void; collected: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 bg-card transition-colors">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center border border-border/40">
        {character.avatar_url
          ? <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
          : <User className="w-4 h-4 text-muted-foreground/40" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{character.name}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {character.tags.slice(0, 3).map(t => (
            <Badge key={t} variant="secondary"
              className="text-[10px] h-4 px-1.5 rounded-full bg-primary/10 text-primary border-primary/15">
              {t}
            </Badge>
          ))}
        </div>
      </div>
      <Button variant="outline" size="sm"
        className={`h-7 px-2 text-xs shrink-0 gap-1 ${collected ? 'text-primary border-primary/40 bg-primary/5' : ''}`}
        onClick={onCollect}>
        {collected ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
        {collected ? '已收藏' : '收藏'}
      </Button>
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────
export default function CharacterDetailDialog({
  character, open, onClose, isMine, onCollect, collected,
}: Props) {
  const [similar, setSimilar] = useState<Character[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [collectedSimilar, setCollectedSimilar] = useState<Set<string>>(new Set());
  const exportedRef = useRef(false);

  // 加载相似角色
  useEffect(() => {
    if (!open || !character) { setSimilar([]); return; }
    if (!character.tags.length) return;
    setSimLoading(true);
    exportedRef.current = false;

    // 查找有共同标签的公开角色
    supabase
      .from('characters')
      .select('*')
      .eq('is_public', true)
      .neq('id', character.id)
      .overlaps('tags', character.tags)
      .order('usage_count', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setSimilar(Array.isArray(data) ? data : []);
        setSimLoading(false);
      });
  }, [open, character]);

  const handleExport = async () => {
    if (!character || exporting) return;
    setExporting(true);
    try {
      await exportCharacterCard(character);
      toast.success('角色卡片已导出为 PNG');
    } catch {
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleCollectSimilar = async (sim: Character) => {
    if (collectedSimilar.has(sim.id)) { toast.info('已收藏过该角色'); return; }
    const { error } = await supabase.from('characters').insert({
      user_id: character?.user_id,
      name: sim.name,
      description: sim.description,
      avatar_url: sim.avatar_url,
      tags: sim.tags,
      is_public: false,
    });
    if (error) { toast.error('收藏失败'); return; }
    setCollectedSimilar(prev => new Set([...prev, sim.id]));
    toast.success(`「${sim.name}」已收藏`);
  };

  if (!character) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">角色详情</DialogTitle>
        </DialogHeader>

        {/* ── 角色基本信息 ── */}
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            {/* 头像 */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted border border-border/50 shrink-0 flex items-center justify-center">
              {character.avatar_url
                ? <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-muted-foreground/40" />
              }
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{character.name}</h2>
                {isMine && (
                  character.is_public
                    ? <Badge className="text-[10px] h-4 px-1.5 bg-green-500/15 text-green-400 border-green-500/20 rounded-full gap-0.5">
                        <Globe className="w-2.5 h-2.5" />公开
                      </Badge>
                    : <Badge className="text-[10px] h-4 px-1.5 bg-muted text-muted-foreground border-border/50 rounded-full gap-0.5">
                        <Lock className="w-2.5 h-2.5" />私有
                      </Badge>
                )}
              </div>

              {/* 标签 */}
              {character.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {character.tags.map(tag => (
                    <Badge key={tag} variant="secondary"
                      className="text-xs h-5 px-2 rounded-full bg-primary/10 text-primary border-primary/15">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 创作统计 */}
              {character.usage_count > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-primary/60" />
                  已用于 <span className="font-semibold text-foreground">{character.usage_count}</span> 次创作
                </p>
              )}
            </div>
          </div>

          {/* 描述 */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
            <p className="text-sm font-medium mb-1.5 text-muted-foreground">角色描述</p>
            <p className="text-sm leading-relaxed text-pretty">
              {character.description || <span className="text-muted-foreground italic">暂无描述</span>}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-1.5 flex-1"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />
              }
              {exporting ? '导出中…' : '导出角色卡片'}
            </Button>

            {!isMine && (
              <Button
                variant="outline"
                className={`gap-1.5 flex-1 ${collected ? 'text-primary border-primary/40 bg-primary/5' : ''}`}
                onClick={onCollect}
              >
                {collected ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                {collected ? '已收藏' : '收藏角色'}
              </Button>
            )}
          </div>

          {/* ── 相似角色推荐 ── */}
          {character.tags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border/50" />
                <p className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3" /> 风格相似的公共角色
                </p>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {simLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/30">
                      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : similar.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-3">
                  暂无相似的公开角色
                </p>
              ) : (
                <div className="space-y-2">
                  {similar.map(sim => (
                    <SimilarCard
                      key={sim.id}
                      character={sim}
                      onCollect={() => handleCollectSimilar(sim)}
                      collected={collectedSimilar.has(sim.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
