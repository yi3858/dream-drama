import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import StylePreviewDialog, { StyleCard, StyleCardSkeleton } from '@/components/common/StylePreviewDialog';
import type { StyleItem } from '@/components/common/StylePreviewDialog';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  BookOpen, Upload, Wand2, CheckCircle2, AlertTriangle, Sparkles,
  ChevronRight, ChevronLeft, Zap, Shield, User, Plus, Trash2, Info, BookUser
} from 'lucide-react';
import CharacterPickerDialog from '@/components/common/CharacterPickerDialog';
import type { CharacterPickerResult } from '@/components/common/CharacterPickerDialog';
import type { Scene, Character } from '@/types';

const STYLES = [
  {
    id: 'anime', label: '二次元', desc: '日系动漫风格，细腻精美',
    color: 'from-violet-500 to-purple-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_974e7650-3c2e-4f56-8c0c-0f1bdfe4ff37.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/4625564/4625564-sd_640_360_30fps.mp4',
    tags: ['日系动漫', '细腻人物', 'ACG风格'],
  },
  {
    id: 'realistic', label: '写实风', desc: '半写实质感，高精细画面',
    color: 'from-blue-500 to-cyan-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_a595b45c-444a-4f20-b00b-e6faf42a9c31.jpg',
    tags: ['写实质感', '高精度', '半写实'],
  },
  {
    id: 'cn3d', label: '3D国漫', desc: '国产3D动漫质感，立体渲染',
    color: 'from-orange-500 to-amber-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_5e126042-34fd-44ce-a869-a0c9d20cde33.jpg',
    tags: ['3D渲染', '国漫风格', '立体感强'],
  },
  {
    id: 'inkwash', label: '水墨风', desc: '中国传统水墨画，山水意境',
    color: 'from-emerald-500 to-green-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_434dd39c-1f53-41de-9875-f9b9f6e4a82f.jpg',
    tags: ['水墨意境', '中国传统', '泼墨写意'],
  },
  {
    id: 'western', label: '欧美漫画', desc: '欧美英雄漫画，粗线条风格',
    color: 'from-pink-500 to-rose-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_7d684568-077f-47e9-b0f8-d27abffdf420.jpg',
    tags: ['欧美风格', '英雄漫画', '粗线条'],
  },
  {
    id: 'ancient', label: '古风插画', desc: '古典仙侠意境，汉服唯美',
    color: 'from-yellow-500 to-amber-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_f6dd43a8-70a6-439f-9cf3-fc8964058f06.jpg',
    tags: ['古风仙侠', '古典意境', '汉服唯美'],
  },
  {
    id: 'cyberpunk', label: '赛博朋克', desc: '霓虹都市夜景，科幻未来感',
    color: 'from-cyan-500 to-blue-700',
    previewUrl: 'https://miaoda-image.bj.bcebos.com/pexel_round1/01/pexels_948645_31413138.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/3573651/3573651-sd_640_360_30fps.mp4',
    tags: ['赛博朋克', '霓虹夜景', '科幻感'],
  },
  {
    id: 'shinkai', label: '新海诚风', desc: '唯美天空光线，日系清新治愈',
    color: 'from-sky-400 to-indigo-500',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_b75ebb34-70a9-42a7-941b-030a7f15350a.jpg',
    tags: ['新海诚风', '唯美光线', '治愈系'],
  },
  {
    id: 'chibi', label: 'Q版萌系', desc: '圆润可爱chibi风格，萌系角色',
    color: 'from-fuchsia-400 to-pink-500',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_982490f8-11c9-4a62-b0cc-c42ce80762b9.jpg',
    tags: ['Q版', '萌系', 'Chibi风格'],
  },
  {
    id: 'pixel', label: '像素风', desc: '复古8-bit像素画风，经典游戏质感',
    color: 'from-lime-400 to-green-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_28c5fc49-746c-4c7d-bb9d-fe3370281211.jpg',
    tags: ['像素艺术', '8-bit复古', '游戏风格'],
  },
  {
    id: 'vaporwave', label: '蒸汽波', desc: '80年代霓虹美学，复古赛博迷幻感',
    color: 'from-purple-400 to-pink-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_7fbb9a25-1f5f-443f-9804-db3ff82f67cd.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/2795405/2795405-sd_640_360_30fps.mp4',
    tags: ['霓虹美学', '蒸汽波', '复古迷幻'],
  },
  {
    id: 'gothic', label: '哥特暗黑', desc: '暗黑奇幻风格，魔法与神秘气息',
    color: 'from-slate-600 to-gray-900',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_1d97aa32-23ec-409d-9e8d-19ae5069fa8b.jpg',
    tags: ['暗黑奇幻', '哥特风格', '神秘感'],
  },
  {
    id: 'ghibli', label: '吉卜力风', desc: '田园治愈风，温暖光影与自然气息',
    color: 'from-teal-400 to-emerald-600',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_80103a0e-ab76-4c0f-b987-6676e8d3f880.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/2098552/2098552-sd_640_360_25fps.mp4',
    tags: ['吉卜力', '田园治愈', '温暖光影'],
  },
  {
    id: 'mecha', label: '机甲科幻', desc: '硬核机甲战斗风，金属质感科幻感',
    color: 'from-blue-600 to-slate-700',
    previewUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_3f778ccb-cd5a-42be-b5c0-14bbcf624abb.jpg',
    videoUrl: 'https://videos.pexels.com/video-files/3048320/3048320-sd_640_360_25fps.mp4',
    tags: ['机甲', '硬核科幻', '金属质感'],
  },
  {
    id: 'flat', label: '扁平插画', desc: '现代极简扁平风，色彩明快设计感强',
    color: 'from-orange-400 to-red-500',
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
const CREDITS_PER_SECOND = 1;

function calcCredits(seconds: number, resolution: string) {
  const res = RESOLUTIONS.find(r => r.id === resolution) ?? RESOLUTIONS[0];
  return Math.ceil(BASE_CREDITS + seconds * res.multiplier * CREDITS_PER_SECOND);
}

// 模拟AI分镜拆解
function mockSplitScenes(text: string): Scene[] {
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 10).slice(0, 8);
  return paragraphs.map((p, i) => ({
    id: `scene-${i + 1}`,
    order: i + 1,
    text: p.trim().slice(0, 120),
    confirmed: false,
  }));
}

export default function NovelToComicPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=输入 2=分镜确认 3=角色设定 4=生成中 5=完成
  const [previewStyle, setPreviewStyle] = useState<StyleItem | null>(null);
  const [title, setTitle] = useState('');
  const [novelText, setNovelText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('anime');
  const [resolution, setResolution] = useState('720p');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charPickerOpen, setCharPickerOpen] = useState(false);
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [workId, setWorkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  // 估算时长（每100字约1秒）
  const estimatedSeconds = Math.max(10, Math.ceil(novelText.length / 100));
  const estimatedCredits = calcCredits(estimatedSeconds, resolution);
  const hasEnoughCredits = (profile?.credits ?? 0) >= estimatedCredits;

  // Step1→2：拆分分镜
  const handleSplitScenes = () => {
    if (!title.trim()) { toast.error('请输入作品标题'); return; }
    if (novelText.trim().length < 50) { toast.error('小说文本至少需要50个字符'); return; }
    if (!copyrightAgreed) { setShowCopyrightDialog(true); return; }
    const splitted = mockSplitScenes(novelText);
    if (splitted.length === 0) { toast.error('未能识别出有效场景，请检查文本格式'); return; }
    setScenes(splitted);
    setStep(2);
  };

  const handleCopyrightConfirm = () => {
    setCopyrightAgreed(true);
    setShowCopyrightDialog(false);
    const splitted = mockSplitScenes(novelText);
    setScenes(splitted);
    setStep(2);
  };

  // 修改场景文本
  const updateScene = (id: string, text: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  };

  const confirmScene = (id: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, confirmed: true } : s));
  };

  // 角色管理
  const addCharacter = () => {
    setCharacters(prev => [...prev, { id: `char-${Date.now()}`, name: '', description: '' }]);
  };

  // 从角色库批量导入
  const handlePickerSelect = (picked: CharacterPickerResult[]) => {
    const newChars: Character[] = picked.map(p => ({
      id: `char-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: p.name,
      description: p.description,
    }));
    setCharacters(prev => {
      const combined = [...prev, ...newChars];
      return combined.slice(0, 5); // 最多5个
    });
  };

  const updateCharacter = (id: string, field: keyof Character, value: string | number) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  // 提交生成任务
  const handleSubmitGeneration = async () => {
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
    setStep(4);
    setProgress(0);

    try {
      const { data, error } = await supabase.from('works').insert({
        user_id: user.id,
        title,
        type: 'novel_to_comic',
        status: 'processing',
        input_text: novelText,
        style: selectedStyle,
        resolution,
        duration_seconds: estimatedSeconds,
        estimated_credits: estimatedCredits,
        scenes: scenes as never,
        characters: characters as never,
        copyright_agreed: copyrightAgreed,
      }).select('id').maybeSingle();

      if (error) throw error;
      setWorkId(data?.id ?? null);

      // 模拟生成进度
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) { clearInterval(interval); return 95; }
          return prev + Math.random() * 8;
        });
      }, 600);

      // 模拟完成（实际应监听 Realtime）
      setTimeout(async () => {
        clearInterval(interval);
        setProgress(100);
        if (data?.id) {
          await supabase.from('works').update({ status: 'completed' }).eq('id', data.id);
        }
        await refreshProfile();
        setLoading(false);
        setStep(5);
        toast.success('漫剧生成完成！');
      }, 8000);
    } catch (e: unknown) {
      setLoading(false);
      setStep(3);
      const msg = e instanceof Error ? e.message : '生成失败，积分已退还';
      toast.error(msg);
    }
  };

  const STEP_LABELS = ['输入素材', '分镜确认', '角色设定', '生成中', '完成'];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">小说转漫剧</h1>
        </div>
        <p className="text-muted-foreground">输入小说文本，AI自动分镜 → 绘图 → 合成漫剧视频</p>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={label} className="flex items-center shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' :
                isDone ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{num}</span>}
                <span className="whitespace-nowrap">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: 输入素材 */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> 基础信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-normal">作品标题 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="给你的漫剧起个名字..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-normal">
                  小说文本 <span className="text-destructive">*</span>
                  <span className="text-muted-foreground ml-2 text-xs">（最少50字）</span>
                </Label>
                <Textarea
                  placeholder="粘贴小说内容，AI将自动识别场景进行分镜拆解...&#10;&#10;示例：&#10;夜色深沉，江城的霓虹灯在细雨中模糊成一片光晕。陆离撑着一把黑色雨伞，站在天桥上俯瞰着城市的喧嚣..."
                  className="min-h-[240px] resize-y"
                  value={novelText}
                  onChange={e => setNovelText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{novelText.length} 字</p>
              </div>
            </CardContent>
          </Card>

          {/* 风格选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> 选择画风
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

          {/* 分辨率与积分 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" /> 输出设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-normal">输出分辨率</Label>
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
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl card-highlight">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">预计消耗积分</p>
                  <p className="text-xs text-muted-foreground">
                    预估时长约 {estimatedSeconds} 秒 × 分辨率倍率
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{estimatedCredits}</p>
                  <p className="text-xs text-muted-foreground">
                    当前余额：{profile?.credits ?? 0}
                  </p>
                </div>
              </div>
              {!hasEnoughCredits && user && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">积分不足，请先充值后再创作</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full h-12 gradient-primary-bg border-0 text-white hover:opacity-90 text-base gap-2"
            onClick={handleSplitScenes}
            disabled={!title.trim() || novelText.length < 50}
          >
            <Wand2 className="w-5 h-5" />
            AI自动分镜拆解
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Step 2: 分镜确认 */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">分镜确认与编辑</h2>
              <p className="text-sm text-muted-foreground">共 {scenes.length} 个场景，可手动调整台词</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              已确认 {scenes.filter(s => s.confirmed).length}/{scenes.length}
            </Badge>
          </div>

          <div className="space-y-4">
            {scenes.map((scene, i) => (
              <Card key={scene.id} className={`border-2 transition-colors ${scene.confirmed ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">场景 {i + 1}</Badge>
                    {scene.confirmed && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 已确认
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    value={scene.text}
                    onChange={e => updateScene(scene.id, e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                    disabled={scene.confirmed}
                  />
                  {!scene.confirmed && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => confirmScene(scene.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> 确认此场景
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4" /> 返回修改
            </Button>
            <Button
              className="flex-1 gradient-primary-bg border-0 text-white hover:opacity-90 gap-2"
              onClick={() => {
                setScenes(prev => prev.map(s => ({ ...s, confirmed: true })));
                setStep(3);
              }}
            >
              全部确认，进入角色设定 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 角色设定 */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> 角色一致性设定
              </h2>
              <p className="text-sm text-muted-foreground mt-1">添加主角信息，AI将保持整集角色外貌一致（可选）</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 self-start"
              onClick={() => setCharPickerOpen(true)}
              disabled={characters.length >= 5}>
              <BookUser className="w-3.5 h-3.5" />
              从角色库选取
            </Button>
          </div>

          {characters.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
              <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">还没有添加角色</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setCharPickerOpen(true)}>
                  <BookUser className="w-4 h-4" /> 从角色库选取
                </Button>
                <Button variant="outline" className="gap-2" onClick={addCharacter}>
                  <Plus className="w-4 h-4" /> 手动添加
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {characters.map((char) => (
                <Card key={char.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">角色信息</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeCharacter(char.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">角色名称</Label>
                        <Input
                          placeholder="如：陆离、苏晚..."
                          value={char.name}
                          onChange={e => updateCharacter(char.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">固定Seed值（可选）</Label>
                        <Input
                          type="number"
                          placeholder="输入数字锁定外貌特征"
                          value={char.seed ?? ''}
                          onChange={e => updateCharacter(char.id, 'seed', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">外貌描述</Label>
                      <Textarea
                        placeholder="描述角色外貌特征，如：长发黑瞳、身形高挑的男主角..."
                        className="min-h-[60px] resize-none text-sm"
                        value={char.description ?? ''}
                        onChange={e => updateCharacter(char.id, 'description', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {characters.length < 5 && (
                <Button variant="outline" className="w-full gap-2" onClick={addCharacter}>
                  <Plus className="w-4 h-4" /> 继续添加角色
                </Button>
              )}
            </div>
          )}

          {/* 费用确认 */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">本次生成费用</span>
                <span className="text-2xl font-bold text-primary">{estimatedCredits} 积分</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>· 画风：{activeStyles.find(s => s.id === selectedStyle)?.label}</p>
                <p>· 分辨率：{resolution.toUpperCase()}</p>
                <p>· 场景数：{scenes.length} 个</p>
                <p>· 当前余额：{profile?.credits ?? 0} 积分</p>
              </div>
              {!hasEnoughCredits && (
                <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  积分不足，请先充值
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4" /> 返回
            </Button>
            <Button
              className="flex-1 gradient-primary-bg border-0 text-white hover:opacity-90 gap-2"
              onClick={() => {
                if (!user) { navigate('/login'); return; }
                if (!hasEnoughCredits) { navigate('/pricing'); return; }
                handleSubmitGeneration();
              }}
              disabled={loading}
            >
              <Wand2 className="w-5 h-5" />
              确认并开始生成
              <span className="text-primary-foreground/70 text-sm">（消耗 {estimatedCredits} 积分）</span>
            </Button>
          </div>

          {/* 角色库选取弹窗 */}
          <CharacterPickerDialog
            open={charPickerOpen}
            onClose={() => setCharPickerOpen(false)}
            onSelect={handlePickerSelect}
          />
        </div>
      )}

      {/* Step 4: 生成中 */}
      {step === 4 && (
        <div className="text-center space-y-8 py-16">
          <div className="w-24 h-24 rounded-full gradient-primary-bg flex items-center justify-center mx-auto animate-pulse-glow">
            <Sparkles className="w-12 h-12 text-white animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">AI正在创作你的漫剧</h2>
            <p className="text-muted-foreground">正在进行分镜绘图与视频合成，请耐心等待</p>
          </div>
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>生成进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              完成后将自动跳转，你也可以关闭此页面，稍后在作品管理中查看
            </p>
          </div>
          <div className="max-w-sm mx-auto grid grid-cols-3 gap-4 text-xs text-muted-foreground">
            {['AI分镜拆解', 'AI绘图合成', '视频渲染'].map((s, i) => (
              <div key={s} className={`p-3 rounded-lg border ${progress > i * 33 ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border'}`}>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: 完成 */}
      {step === 5 && (
        <div className="text-center space-y-8 py-16">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">🎉 漫剧已生成完成！</h2>
            <p className="text-muted-foreground">《{title}》已保存到你的作品库</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90 gap-2" asChild>
              <a href={`/profile/works`}>前往作品管理</a>
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => {
              setStep(1); setTitle(''); setNovelText('');
              setScenes([]); setCharacters([]); setCopyrightAgreed(false);
            }}>
              再创作一部
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            本作品已自动添加"AI生成"标识，符合2026年AI内容监管规范
          </div>
        </div>
      )}

      {/* 版权协议弹窗 */}
      <Dialog open={showCopyrightDialog} onOpenChange={setShowCopyrightDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              版权承诺确认
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300">
                根据相关法律规定，使用他人作品需取得版权授权。请仔细阅读并确认以下内容。
              </p>
            </div>
            <div className="space-y-2 text-muted-foreground">
              <p>我承诺：</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>上传/粘贴的文本内容为本人原创或已获得完整版权授权</li>
                <li>不侵犯任何第三方的著作权、肖像权及其他合法权益</li>
                <li>如产生版权纠纷，由本人承担全部法律责任</li>
                <li>本平台仅提供技术工具，不对内容版权承担连带责任</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowCopyrightDialog(false)}>取消</Button>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" onClick={handleCopyrightConfirm}>
              我确认已获得完整版权授权
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 画风大图预览弹窗 */}
      <StylePreviewDialog style={previewStyle} onClose={() => setPreviewStyle(null)} />
    </div>
  );
}
