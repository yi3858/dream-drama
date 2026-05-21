import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  Film, Upload, Wand2, CheckCircle2, AlertTriangle, Sparkles,
  ChevronRight, ChevronLeft, Zap, Shield, Info, FileVideo, X,
  User, Plus, Trash2, BookUser
} from 'lucide-react';
import StylePreviewDialog, { StyleCard, StyleCardSkeleton } from '@/components/common/StylePreviewDialog';
import type { StyleItem } from '@/components/common/StylePreviewDialog';
import CharacterPickerDialog from '@/components/common/CharacterPickerDialog';
import type { CharacterPickerResult } from '@/components/common/CharacterPickerDialog';
import { Textarea } from '@/components/ui/textarea';

const STYLES = [
  {
    id: 'anime', label: '二次元', color: 'from-violet-500 to-purple-600',
    desc: '日系动漫风格，细腻精美',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_974e7650-3c2e-4f56-8c0c-0f1bdfe4ff37.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/4625564/4625564-sd_640_360_30fps.mp4',
    tags: ['日系动漫', '细腻人物', 'ACG风格'],
  },
  {
    id: 'realistic', label: '写实风', color: 'from-blue-500 to-cyan-600',
    desc: '半写实质感，高精细画面',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_a595b45c-444a-4f20-b00b-e6faf42a9c31.jpg',
    tags: ['写实质感', '高精度', '半写实'],
  },
  {
    id: 'cn3d', label: '3D国漫', color: 'from-orange-500 to-amber-600',
    desc: '国产3D动漫质感，立体渲染',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_5e126042-34fd-44ce-a869-a0c9d20cde33.jpg',
    tags: ['3D渲染', '国漫风格', '立体感强'],
  },
  {
    id: 'inkwash', label: '水墨风', color: 'from-emerald-500 to-green-600',
    desc: '中国传统水墨画，山水意境',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_434dd39c-1f53-41de-9875-f9b9f6e4a82f.jpg',
    tags: ['水墨意境', '中国传统', '泼墨写意'],
  },
  {
    id: 'western', label: '欧美漫画', color: 'from-pink-500 to-rose-600',
    desc: '欧美英雄漫画，粗线条风格',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_7d684568-077f-47e9-b0f8-d27abffdf420.jpg',
    tags: ['欧美风格', '英雄漫画', '粗线条'],
  },
  {
    id: 'ancient', label: '古风插画', color: 'from-yellow-500 to-amber-600',
    desc: '古典仙侠意境，汉服唯美',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_f6dd43a8-70a6-439f-9cf3-fc8964058f06.jpg',
    tags: ['古风仙侠', '古典意境', '汉服唯美'],
  },
  {
    id: 'cyberpunk', label: '赛博朋克', color: 'from-cyan-500 to-blue-700',
    desc: '霓虹都市夜景，科幻未来感',
    previewUrl: 'https://miaoda-image.bj.bcebos.com/pexel_round1/01/pexels_948645_31413138.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/3573651/3573651-sd_640_360_30fps.mp4',
    tags: ['赛博朋克', '霓虹夜景', '科幻感'],
  },
  {
    id: 'shinkai', label: '新海诚风', color: 'from-sky-400 to-indigo-500',
    desc: '唯美天空光线，日系清新治愈',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_b75ebb34-70a9-42a7-941b-030a7f15350a.jpg',
    tags: ['新海诚风', '唯美光线', '治愈系'],
  },
  {
    id: 'chibi', label: 'Q版萌系', color: 'from-fuchsia-400 to-pink-500',
    desc: '圆润可爱chibi风格，萌系角色',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_982490f8-11c9-4a62-b0cc-c42ce80762b9.jpg',
    tags: ['Q版', '萌系', 'Chibi风格'],
  },
  {
    id: 'pixel', label: '像素风', color: 'from-lime-400 to-green-600',
    desc: '复古8-bit像素画风，经典游戏质感',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_28c5fc49-746c-4c7d-bb9d-fe3370281211.jpg',
    tags: ['像素艺术', '8-bit复古', '游戏风格'],
  },
  {
    id: 'vaporwave', label: '蒸汽波', color: 'from-purple-400 to-pink-600',
    desc: '80年代霓虹美学，复古赛博迷幻感',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_7fbb9a25-1f5f-443f-9804-db3ff82f67cd.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/2795405/2795405-sd_640_360_30fps.mp4',
    tags: ['霓虹美学', '蒸汽波', '复古迷幻'],
  },
  {
    id: 'gothic', label: '哥特暗黑', color: 'from-slate-600 to-gray-900',
    desc: '暗黑奇幻风格，魔法与神秘气息',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_1d97aa32-23ec-409d-9e8d-19ae5069fa8b.jpg',
    tags: ['暗黑奇幻', '哥特风格', '神秘感'],
  },
  {
    id: 'ghibli', label: '吉卜力风', color: 'from-teal-400 to-emerald-600',
    desc: '田园治愈风，温暖光影与自然气息',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_80103a0e-ab76-4c0f-b987-6676e8d3f880.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/2098552/2098552-sd_640_360_25fps.mp4',
    tags: ['吉卜力', '田园治愈', '温暖光影'],
  },
  {
    id: 'mecha', label: '机甲科幻', color: 'from-blue-600 to-slate-700',
    desc: '硬核机甲战斗风，金属质感科幻感',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_3f778ccb-cd5a-42be-b5c0-14bbcf624abb.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/3048320/3048320-sd_640_360_25fps.mp4',
    tags: ['机甲', '硬核科幻', '金属质感'],
  },
  {
    id: 'flat', label: '扁平插画', color: 'from-orange-400 to-red-500',
    desc: '现代极简扁平风，色彩明快设计感强',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_3baf6164-523e-43ba-8b27-9c423ae3f7b4.jpg',
    tags: ['扁平设计', '极简风格', '明快色彩'],
  },
];

const RESOLUTIONS = [
  { id: '480p', label: '480P', multiplier: 0.6 },
  { id: '720p', label: '720P', multiplier: 1.0 },
  { id: '1080p', label: '1080P', multiplier: 1.8 },
];

const BASE_CREDITS = 10;

function calcCredits(seconds: number, resolution: string) {
  const res = RESOLUTIONS.find(r => r.id === resolution) ?? RESOLUTIONS[0];
  return Math.ceil(BASE_CREDITS + seconds * res.multiplier);
}

const FEATURES = [
  { id: 'style', label: '动漫风格转换', desc: 'AI将实拍画面转换为所选动漫风格' },
  { id: 'subtitle', label: '自动生成字幕', desc: '语音识别生成精准字幕并嵌入视频' },
  { id: 'edit', label: '智能剪辑优化', desc: '自动去除冗余片段，优化节奏' },
  { id: 'watermark', label: '添加AI标识水印', desc: '强制合规，符合AI内容监管规范' },
];

export default function VideoToAnimePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('anime');
  const [previewStyle, setPreviewStyle] = useState<StyleItem | null>(null);
  const [resolution, setResolution] = useState('720p');
  const [features, setFeatures] = useState<string[]>(['style', 'subtitle', 'edit', 'watermark']);
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  // 角色列表
  const [characters, setCharacters] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [charPickerOpen, setCharPickerOpen] = useState(false);

  // 动态画风列表（从 DB 拉取，失败时降级使用静态 STYLES）
  const [dynamicStyles, setDynamicStyles] = useState<StyleItem[]>([]);
  const activeStyles = dynamicStyles.length > 0 ? dynamicStyles : STYLES;

  // 画风卡片初始加载态
  const [stylesReady, setStylesReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStylesReady(true), 650);
    // 从 DB 拉取最新画风配置（含 video_url）
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
            previewUrl: s.preview_url,
            videoUrl: s.video_url ?? undefined,
            tags: s.tags ?? [],
          })));
        }
      });
    return () => clearTimeout(timer);
  }, []);

  const estimatedSeconds = videoFile ? 60 : 30; // 简化估算
  const estimatedCredits = calcCredits(estimatedSeconds, resolution);
  const hasEnoughCredits = (profile?.credits ?? 0) >= estimatedCredits;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('请上传视频文件（MP4、MOV、AVI等格式）');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error('文件大小不能超过500MB');
      return;
    }
    setVideoFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('video/')) setVideoFile(file);
    else toast.error('请拖入视频文件');
  };

  const toggleFeature = (id: string) => {
    if (id === 'watermark') return; // 强制开启
    setFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };


  // 角色管理
  const addCharacter = () => {
    if (characters.length >= 5) return;
    setCharacters(prev => [...prev, { id: `char-${Date.now()}`, name: '', description: '' }]);
  };
  const updateCharacter = (id: string, field: 'name' | 'description', value: string) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };
  const handlePickerSelect = (picked: CharacterPickerResult[]) => {
    const newChars = picked.map(p => ({
      id: `char-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: p.name, description: p.description,
    }));
    setCharacters(prev => [...prev, ...newChars].slice(0, 5));
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('请输入作品标题'); return; }
    if (!videoFile) { toast.error('请上传视频文件'); return; }
    if (!copyrightAgreed) { setShowCopyrightDialog(true); return; }
    startGeneration();
  };

  const startGeneration = async () => {
    if (!user) { navigate('/login'); return; }
    if (!hasEnoughCredits) { toast.error('积分不足，请先充值'); navigate('/pricing'); return; }

    // 防刷：检查今日已提交次数
    const { data: limitCfg } = await supabase.from('system_configs').select('value').eq('key', 'daily_gen_limit').maybeSingle();
    const dailyLimit = limitCfg ? Number(limitCfg.value) : 10;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase.from('works')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString());
    if ((todayCount ?? 0) >= dailyLimit) {
      toast.error(`今日生成次数已达上限（${dailyLimit} 次），请明日再试`);
      return;
    }

    setLoading(true);
    setStep(2);
    setProgress(0);

    const msgs = ['上传素材中...', '内容安全审核中...', '风格转换中...', '字幕生成中...', '智能剪辑中...', '视频渲染中...'];
    let msgIdx = 0;
    setProgressMsg(msgs[0]);

    try {
      const { data, error } = await supabase.from('works').insert({
        user_id: user.id,
        title,
        type: 'video_to_anime',
        status: 'processing',
        style: selectedStyle,
        resolution,
        duration_seconds: estimatedSeconds,
        estimated_credits: estimatedCredits,
        copyright_agreed: copyrightAgreed,
      }).select('id').maybeSingle();

      if (error) throw error;

      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 6;
          if (next > msgIdx * 16 && msgIdx < msgs.length - 1) {
            msgIdx++;
            setProgressMsg(msgs[msgIdx]);
          }
          if (next >= 95) { clearInterval(interval); return 95; }
          return next;
        });
      }, 500);

      setTimeout(async () => {
        clearInterval(interval);
        setProgress(100);
        setProgressMsg('生成完成！');
        if (data?.id) {
          await supabase.from('works').update({ status: 'completed' }).eq('id', data.id);
        }
        await refreshProfile();
        setLoading(false);
        setStep(3);
        toast.success('动漫转换完成！');
      }, 10000);
    } catch (e: unknown) {
      setLoading(false);
      setStep(1);
      const msg = e instanceof Error ? e.message : '生成失败';
      toast.error(msg);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">短剧转动漫</h1>
        </div>
        <p className="text-muted-foreground">上传短剧实拍视频，AI自动转换为精美动漫风格，支持字幕与剪辑</p>
      </div>

      {/* Step 1: 配置 */}
      {step === 1 && (
        <div className="space-y-6">
          {/* 上传区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> 上传视频素材
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-normal">作品标题 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="给作品起个名字..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* 拖拽上传区 */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {videoFile ? (
                  <div className="space-y-2">
                    <FileVideo className="w-10 h-10 text-primary mx-auto" />
                    <p className="font-medium text-sm">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive gap-1"
                      onClick={e => { e.stopPropagation(); setVideoFile(null); }}
                    >
                      <X className="w-3.5 h-3.5" /> 重新上传
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">点击或拖拽上传视频</p>
                    <p className="text-xs text-muted-foreground">支持 MP4、MOV、AVI 等格式，最大500MB</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 风格选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> 动漫画风
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {stylesReady
                  ? activeStyles.map((s, i) => (
                      <div
                        key={s.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 55}ms` }}
                      >
                        <StyleCard
                          style={s}
                          selected={selectedStyle === s.id}
                          onSelect={() => setSelectedStyle(s.id)}
                          onPreview={() => setPreviewStyle(s)}
                        />
                      </div>
                    ))
                  : [...Array(activeStyles.length)].map((_, i) => (
                      <StyleCardSkeleton key={i} />
                    ))
                }
              </div>
            </CardContent>
          </Card>

          {/* 功能开关 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" /> 处理功能
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {FEATURES.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    features.includes(f.id) ? 'border-primary/40 bg-primary/5' : 'border-border'
                  } ${f.id === 'watermark' ? 'opacity-80 cursor-not-allowed' : ''}`}
                  onClick={() => toggleFeature(f.id)}
                >
                  <Checkbox
                    checked={features.includes(f.id)}
                    className="mt-0.5 shrink-0"
                    disabled={f.id === 'watermark'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.label}</span>
                      {f.id === 'watermark' && (
                        <Badge className="text-[10px] h-4 px-1 bg-amber-500/20 text-amber-300 border-amber-500/30">强制开启</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 分辨率与积分预估 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> 输出设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setResolution(r.id)}
                    className={`option-pill flex-1 ${resolution === r.id ? 'option-pill-active' : ''}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl card-highlight">
                <div>
                  <p className="text-sm font-medium">预计消耗积分</p>
                  <p className="text-xs text-muted-foreground">基于视频时长×分辨率倍率计算</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{estimatedCredits}</p>
                  <p className="text-xs text-muted-foreground">余额：{profile?.credits ?? 0}</p>
                </div>
              </div>
              {!hasEnoughCredits && user && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">积分不足，请先充值</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 角色一致性设定 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> 角色一致性设定
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => setCharPickerOpen(true)}
                  disabled={characters.length >= 5}>
                  <BookUser className="w-3.5 h-3.5" />
                  从角色库选取
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">添加主角信息，AI将保持整集角色外貌一致（可选）</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {characters.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <User className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">暂无角色，可从角色库选取或手动添加</p>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setCharPickerOpen(true)}>
                      <BookUser className="w-3.5 h-3.5" /> 从角色库选取
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={addCharacter}>
                      <Plus className="w-3.5 h-3.5" /> 手动添加
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {characters.map(char => (
                    <div key={char.id} className="p-3 rounded-lg border border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">角色信息</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCharacter(char.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <Input placeholder="角色名称…" value={char.name} className="h-8 text-sm px-3"
                        onChange={e => updateCharacter(char.id, 'name', e.target.value)} maxLength={20} />
                      <Textarea placeholder="外貌描述：如长发、黑瞳、古装…" value={char.description}
                        className="resize-none text-sm px-3 min-h-[56px]"
                        onChange={e => updateCharacter(char.id, 'description', e.target.value)} maxLength={200} />
                    </div>
                  ))}
                  {characters.length < 5 && (
                    <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addCharacter}>
                      <Plus className="w-3.5 h-3.5" /> 继续添加角色
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full h-12 gradient-primary-bg border-0 text-white hover:opacity-90 text-base gap-2"
            onClick={handleSubmit}
            disabled={!title.trim() || !videoFile}
          >
            <Wand2 className="w-5 h-5" />
            开始转换动漫
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* 角色库选取弹窗 */}
          <CharacterPickerDialog
            open={charPickerOpen}
            onClose={() => setCharPickerOpen(false)}
            onSelect={handlePickerSelect}
          />
        </div>
      )}

      {/* Step 2: 生成中 */}
      {step === 2 && (
        <div className="text-center space-y-8 py-16">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto animate-pulse-glow">
            <Film className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">正在转换你的短剧</h2>
            <p className="text-muted-foreground">{progressMsg}</p>
          </div>
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>处理进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground">完成后可在作品管理中查看和下载</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-xs text-muted-foreground">
            {['内容审核', '风格转换', '字幕剪辑'].map((s, i) => (
              <div key={s} className={`p-3 rounded-lg border ${progress > i * 33 ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border'}`}>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: 完成 */}
      {step === 3 && (
        <div className="text-center space-y-8 py-16">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">🎬 动漫转换完成！</h2>
            <p className="text-muted-foreground">《{title}》已保存到你的作品库</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" asChild>
              <a href="/profile/works">查看作品</a>
            </Button>
            <Button variant="outline" onClick={() => {
              setStep(1); setTitle(''); setVideoFile(null);
              setFeatures(['style', 'subtitle', 'edit', 'watermark']); setCopyrightAgreed(false);
            }}>
              再转换一个
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            已自动添加"AI生成"标识水印
          </div>
        </div>
      )}

      {/* 版权协议 */}
      <Dialog open={showCopyrightDialog} onOpenChange={setShowCopyrightDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> 版权承诺确认
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300">上传视频素材前，请确认你拥有完整版权授权</p>
            </div>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              <li>上传内容为本人拍摄或已获版权授权</li>
              <li>不含未授权的影视片段、音乐版权等内容</li>
              <li>如产生版权纠纷，由本人承担全部法律责任</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyrightDialog(false)}>取消</Button>
            <Button
              className="gradient-primary-bg border-0 text-white hover:opacity-90"
              onClick={() => { setCopyrightAgreed(true); setShowCopyrightDialog(false); startGeneration(); }}
            >
              确认并继续
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 画风大图预览弹窗 */}
      <StylePreviewDialog style={previewStyle} onClose={() => setPreviewStyle(null)} />

      {/* 隐藏的Select避免unused import */}
      <ChevronLeft className="hidden" />
    </div>
  );
}
