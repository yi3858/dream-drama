import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X, ZoomIn, Play, Pause, Volume2, VolumeX, Maximize2, Film } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface StyleItem {
  id: string;
  label: string;
  desc: string;
  color: string;
  previewUrl: string;
  videoUrl?: string;   // 可选的动态效果演示视频
  tags?: string[];
}

interface StylePreviewDialogProps {
  style: StyleItem | null;
  onClose: () => void;
}

type PreviewTab = 'video' | 'image';

export default function StylePreviewDialog({ style, onClose }: StylePreviewDialogProps) {
  const [tab, setTab] = useState<PreviewTab>('video');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 切换风格时重置状态
  useEffect(() => {
    setProgress(0);
    setPlaying(false);
    setVideoLoaded(false);
    setVideoError(false);
    setTab(style?.videoUrl ? 'video' : 'image');
  }, [style?.id]);

  // Dialog 打开后自动播放
  useEffect(() => {
    if (!style || tab !== 'video' || !videoRef.current) return;
    const v = videoRef.current;
    v.currentTime = 0;
    const play = async () => {
      try { await v.play(); setPlaying(true); } catch { /* autoplay blocked */ }
    };
    if (videoLoaded) play();
  }, [tab, videoLoaded, style?.id]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else           { v.pause(); setPlaying(false); }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
    setProgress(ratio * 100);
  }, []);

  const handleClose = () => {
    videoRef.current?.pause();
    onClose();
  };

  const hasVideo = !!style?.videoUrl && !videoError;

  return (
    <Dialog open={!!style} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl p-0 overflow-hidden border-border/50 bg-[hsl(228_32%_8%)] shadow-[0_24px_80px_hsl(228_50%_3%/0.7)]">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/75 transition-colors ring-1 ring-white/10"
          aria-label="关闭预览"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>

        {/* Tab 切换（仅在有视频时显示） */}
        {hasVideo && (
          <div className="absolute top-3 left-3 z-20 flex gap-1 bg-black/50 backdrop-blur-sm rounded-full p-1 ring-1 ring-white/10">
            <button
              onClick={() => setTab('video')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                tab === 'video'
                  ? 'bg-primary text-white shadow-[0_0_10px_hsl(var(--primary)/0.5)]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" /> 视频预览
            </button>
            <button
              onClick={() => { setTab('image'); videoRef.current?.pause(); setPlaying(false); }}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                tab === 'image'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <ZoomIn className="w-3 h-3" /> 效果图
            </button>
          </div>
        )}

        {/* ── 媒体区域 ── */}
        <div className="relative w-full aspect-[16/10] overflow-hidden bg-[hsl(228_35%_5%)]">

          {/* 视频播放器 */}
          {hasVideo && (
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${tab === 'video' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              {/* 海报占位 / 加载状态 */}
              {!videoLoaded && (
                <div className="absolute inset-0">
                  <img src={style!.previewUrl} alt={style!.label} className="w-full h-full object-cover opacity-40 blur-sm" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/60 border-t-primary animate-spin" />
                    <span className="text-xs text-white/60">加载视频中…</span>
                  </div>
                </div>
              )}

              {/* 视频元素 */}
              <video
                ref={videoRef}
                src={style?.videoUrl}
                poster={style?.previewUrl}
                loop
                muted={muted}
                playsInline
                preload="auto"
                className={`w-full h-full object-cover transition-opacity duration-300 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                onCanPlay={() => setVideoLoaded(true)}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => { setVideoError(true); setVideoLoaded(false); }}
                onClick={togglePlay}
              />

              {/* 视频控制层 */}
              {videoLoaded && (
                <>
                  {/* 中央点击大按钮（仅暂停时可见） */}
                  {!playing && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 flex items-center justify-center group/play"
                    >
                      <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm ring-2 ring-white/20 flex items-center justify-center transition-transform duration-200 group-hover/play:scale-110">
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                      </div>
                    </button>
                  )}

                  {/* 底部控制栏 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-3 px-4">
                    {/* 进度条 */}
                    <div
                      className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer group/seek"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-primary rounded-full relative transition-all duration-100"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_6px_hsl(var(--primary)/0.8)] opacity-0 group-hover/seek:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* 按钮行 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={togglePlay}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          {playing
                            ? <Pause className="w-3.5 h-3.5 text-white fill-white" />
                            : <Play  className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                          }
                        </button>
                        <button
                          onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          {muted
                            ? <VolumeX className="w-3.5 h-3.5 text-white/70" />
                            : <Volume2 className="w-3.5 h-3.5 text-white" />
                          }
                        </button>
                        <span className="text-[11px] text-white/60">动态演示</span>
                      </div>
                      <button
                        onClick={() => videoRef.current?.requestFullscreen?.()}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-white/70" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 静态大图 */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              tab === 'image' || !hasVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {style?.previewUrl && (
              <img
                src={style.previewUrl}
                alt={`${style.label}风格预览`}
                className="w-full h-full object-cover"
              />
            )}
            {/* 若无视频，显示角标提示 */}
            {!hasVideo && style && (
              <div className="absolute bottom-3 right-3">
                <Badge className="text-[10px] bg-black/50 backdrop-blur-sm border-white/10 text-white/60 rounded-full">
                  <Film className="w-2.5 h-2.5 mr-1 opacity-60" /> 视频演示即将上线
                </Badge>
              </div>
            )}
          </div>

          {/* 底部渐变遮罩（信息区衔接） */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[hsl(228_32%_8%)] to-transparent pointer-events-none" />
        </div>

        {/* ── 信息区域 ── */}
        <div className="px-6 pb-6 pt-0 -mt-14 relative z-10">
          <div className="flex items-end gap-3 mb-4">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${style?.color ?? ''} flex items-center justify-center shrink-0 shadow-[0_4px_16px_hsl(var(--primary)/0.3)]`} />
            <div>
              <h3 className="text-xl font-bold text-balance tracking-tight">{style?.label}</h3>
              <p className="text-sm text-muted-foreground text-pretty mt-0.5">{style?.desc}</p>
            </div>
          </div>
          {style?.tags && style.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {style.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-primary/12 text-primary border-primary/20 rounded-full px-3"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 画风选择卡片：选中弹跳 + 光晕呼吸 + 徽章弹入
 */
interface StyleCardProps {
  style: StyleItem;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

export function StyleCard({ style, selected, onSelect, onPreview }: StyleCardProps) {
  // 追踪"刚刚选中/取消"以触发单次弹跳动画
  const [animState, setAnimState] = useState<'idle' | 'selecting' | 'deselecting'>('idle');
  const prevSelected = useRef(selected);
  // 徽章每次从 false→true 都重新 mount，key 自增保证动画重放
  const [badgeKey, setBadgeKey] = useState(0);

  useEffect(() => {
    if (prevSelected.current === selected) return;
    if (selected) {
      setAnimState('selecting');
      setBadgeKey(k => k + 1);
      const t = setTimeout(() => setAnimState('idle'), 420);
      prevSelected.current = true;
      return () => clearTimeout(t);
    } else {
      setAnimState('deselecting');
      const t = setTimeout(() => setAnimState('idle'), 320);
      prevSelected.current = false;
      return () => clearTimeout(t);
    }
  }, [selected]);

  const cardAnim =
    animState === 'selecting'   ? 'animate-card-select' :
    animState === 'deselecting' ? 'animate-card-deselect' : '';

  const hasVideo = !!style.videoUrl;

  return (
    <div
      className={[
        'relative rounded-2xl overflow-hidden cursor-pointer group',
        selected && animState === 'idle'
          ? 'animate-ring-breathe'
          : selected
            ? 'ring-2 ring-primary shadow-[0_0_16px_hsl(var(--primary)/0.3)]'
            : 'ring-1 ring-border/60 hover:ring-primary/40',
        !selected ? 'hover:shadow-card transition-shadow duration-300' : '',
        cardAnim,
        'will-change-transform',
      ].filter(Boolean).join(' ')}
      style={{ transformOrigin: 'center center' }}
      onClick={onSelect}
    >
      {/* 缩略图 */}
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <img
          src={style.previewUrl}
          alt={style.label}
          className={[
            'w-full h-full object-cover',
            'transition-[transform,filter] duration-500 ease-out',
            'group-hover:scale-[1.07] group-hover:brightness-110 group-hover:saturate-110',
            selected ? 'scale-[1.03]' : '',
          ].filter(Boolean).join(' ')}
        />
      </div>

      {/* 选中时的渐变覆层 */}
      <div
        className={[
          'absolute inset-0 transition-opacity duration-300 pointer-events-none',
          'bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/8',
          selected ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* 预览按钮：有视频→Play，无视频→ZoomIn */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onPreview(); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-200 group-hover:scale-100 scale-75 hover:bg-black/75 ring-1 ring-white/15"
        aria-label={hasVideo ? `播放${style.label}视频演示` : `预览${style.label}大图`}
      >
        {hasVideo
          ? <Play className="w-3.5 h-3.5 text-white/90 fill-white/90 ml-0.5" />
          : <ZoomIn className="w-3.5 h-3.5 text-white/85" />
        }
      </button>

      {/* 有视频时左下角显示 VIDEO 角标 */}
      {hasVideo && (
        <div className="absolute bottom-10 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Badge className="text-[9px] h-4 px-1.5 bg-primary/80 backdrop-blur-sm border-0 text-white rounded-full gap-0.5">
            <Film className="w-2.5 h-2.5" /> 视频
          </Badge>
        </div>
      )}

      {/* 选中徽标：每次选中弹入 */}
      {selected && (
        <div
          key={badgeKey}
          className="absolute top-2 left-2 w-5 h-5 rounded-full gradient-primary-bg flex items-center justify-center shadow-[0_0_10px_hsl(var(--primary)/0.7)] animate-badge-pop"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* 底部标签信息 */}
      <div
        className={[
          'px-3 py-2.5 transition-[background,color] duration-300',
          selected ? 'bg-primary/12' : 'bg-card',
        ].join(' ')}
      >
        <div className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm bg-gradient-to-br ${style.color} shrink-0 transition-transform duration-300 ${selected ? 'scale-125' : 'scale-100'}`} />
          <span className={`text-sm font-medium truncate transition-colors duration-200 ${selected ? 'text-foreground' : ''}`}>
            {style.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{style.desc}</p>
      </div>
    </div>
  );
}

/**
 * 画风卡片骨架屏：与 StyleCard 等尺寸，带扫光动画
 */
export function StyleCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden ring-1 ring-border/40">
      {/* 缩略图占位 */}
      <div className="aspect-video w-full skeleton-base" />
      {/* 底部标签占位 */}
      <div className="px-3 py-2.5 bg-card space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm skeleton-base shrink-0" />
          <div className="h-3.5 w-16 skeleton-base rounded-full" />
        </div>
        <div className="h-3 w-24 skeleton-base rounded-full" />
      </div>
    </div>
  );
}
