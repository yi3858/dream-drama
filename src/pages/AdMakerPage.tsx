import { useState, useRef, useCallback } from 'react';
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
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  Megaphone, Wand2, Upload, CheckCircle2, AlertTriangle,
  Sparkles, Download, Clock, Zap, Shield, X, Image as ImageIcon,
  Music, ChevronDown, ChevronUp, Info, RefreshCw, Play
} from 'lucide-react';

// ─── 常量数据 ─────────────────────────────────────────
const AD_TYPES = [
  { id: 'product', label: '产品广告', icon: '🛍️', desc: '展示产品特性与卖点' },
  { id: 'brand', label: '品牌宣传片', icon: '✨', desc: '塑造品牌形象与调性' },
  { id: 'ecommerce', label: '带货短视频', icon: '🛒', desc: '带动购买转化的种草视频' },
  { id: 'store', label: '门店推广', icon: '🏪', desc: '线下门店引流与展示' },
  { id: 'holiday', label: '节日广告', icon: '🎉', desc: '节日氛围营造与促销' },
];

const AD_STYLES = [
  { id: 'cinematic', label: '电影质感', desc: '胶片光影，大片气质' },
  { id: 'luxury', label: '高级质感', desc: '奢华精致，品质感强' },
  { id: 'business', label: '简约商务', desc: '干净利落，专业可信' },
  { id: 'chinese', label: '国风', desc: '东方美学，传统韵味' },
  { id: 'cyberpunk', label: '赛博朋克', desc: '霓虹未来，科技感强' },
  { id: 'realistic', label: '写实', desc: '真实还原，自然可信' },
];

const RESOLUTIONS = [
  { id: '480p', label: '480P', multiplier: 0.6 },
  { id: '720p', label: '720P', multiplier: 1.0 },
  { id: '1080p', label: '1080P', multiplier: 1.8 },
];

const DURATIONS = [5, 8, 10, 15];

const BASE_CREDITS = 15;
const CREDITS_PER_SECOND = 2;

// 每种广告类型的预设模板
const AD_TEMPLATES: Record<string, Array<{ name: string; prompt: string }>> = {
  product: [
    { name: '科技产品展示', prompt: '一款未来科技感十足的产品从黑暗中缓缓浮现，光线扫射过产品表面，呈现出精致的细节与工艺，配合动感的粒子效果，展现产品的创新与卓越性能' },
    { name: '食品饮料广告', prompt: '新鲜原料在镜头前缓慢运动，水珠滚落，产品以诱人的角度出现，温暖的暖调光线营造出美味与健康的氛围，传递天然纯粹的品质感' },
    { name: '美妆护肤展示', prompt: '精华液以柔美弧线流动，融入肌肤的过程以微距特写呈现，珠光质感与轻柔光晕相互辉映，传递奢华、滋养、焕亮的产品功效' },
  ],
  brand: [
    { name: '企业形象片', prompt: '城市全景与企业建筑交替出现，员工充满活力地工作，产品生产线精密运转，以恢宏的视角展现企业的规模与实力，激发信任感与品牌认同' },
    { name: '品牌故事片', prompt: '从品牌创始的感人瞬间出发，跨越时代的历史画面与当代场景交织，呈现品牌坚守初心、与用户共同成长的温暖故事' },
  ],
  ecommerce: [
    { name: '开箱种草', prompt: '快节奏的剪辑展示产品开箱过程，真实的使用场景与效果对比呈现，大量细节特写与用户反馈，配合活泼的字幕与节奏感强烈的背景音乐' },
    { name: '限时促销', prompt: '醒目的价格标签与折扣数字以动态方式出现，产品快速切换展示，倒计时元素制造紧迫感，鲜艳的色彩与爆炸式构图传递超值优惠信息' },
    { name: '使用场景展示', prompt: '真实生活场景中用户使用产品的过程，展现产品解决问题的价值，自然流畅的镜头语言让观众代入感强烈，引发购买冲动' },
  ],
  store: [
    { name: '门店环境展示', prompt: '优雅的门店外景与温馨的内部陈设交替出现，灯光烘托出舒适的消费氛围，产品陈列精美，服务人员专业热情，邀请顾客前来体验' },
    { name: '活动促销', prompt: '热闹的店内活动现场，人潮涌动，限时优惠的信息以醒目方式呈现，欢快的氛围传递出门店的人气与活力，吸引周边消费者到店' },
  ],
  holiday: [
    { name: '新年祝福', prompt: '金红色的新年元素与品牌LOGO相融合，烟花绽放，喜庆的氛围中产品以礼品形式呈现，传递新年祝福的同时强化品牌温度' },
    { name: '节日促销', prompt: '节日装饰与产品巧妙结合，礼盒包装精美呈现，限时优惠信息嵌入欢乐场景，配合节日专属背景音乐，激发节日消费欲望' },
  ],
};

function calcCredits(seconds: number, resolution: string): number {
  const res = RESOLUTIONS.find(r => r.id === resolution) ?? RESOLUTIONS[0];
  return Math.ceil(BASE_CREDITS + seconds * res.multiplier * CREDITS_PER_SECOND);
}

const BUCKET = 'ad-assets';

// ─── 文件上传区组件 ────────────────────────────────────
function FileUploadZone({
  accept, maxSizeMB, label, hint, icon: Icon, files, onAdd, onRemove, maxFiles = 1,
}: {
  accept: string; maxSizeMB: number; label: string; hint: string;
  icon: React.ElementType; files: File[]; onAdd: (f: File) => void;
  onRemove: (i: number) => void; maxFiles?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.size > maxSizeMB * 1024 * 1024) { toast.error(`文件不能超过 ${maxSizeMB}MB`); return; }
    onAdd(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-normal">{label}</Label>
      {files.length < maxFiles && (
        <div
          className="border-2 border-dashed border-border/60 hover:border-primary/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-primary/5"
          onClick={() => ref.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <Icon className="w-7 h-7 mx-auto text-muted-foreground/40 mb-1.5" />
          <p className="text-xs text-muted-foreground">{hint}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">点击或拖拽上传 · 最大 {maxSizeMB}MB</p>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs flex-1 min-w-0 truncate">{f.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
              <button type="button" onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────
export default function AdMakerPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // 表单状态
  const [adType, setAdType] = useState('product');
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration] = useState(10);
  const [style, setStyle] = useState('cinematic');
  const [realPersonMode, setRealPersonMode] = useState(false);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [logoFile, setLogoFile] = useState<File[]>([]);
  const [bgmFile, setBgmFile] = useState<File[]>([]);
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // 生成状态
  const [step, setStep] = useState<'form' | 'generating' | 'done' | 'error'>('form');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const estimatedCredits = calcCredits(duration, resolution);
  const hasEnoughCredits = (profile?.credits ?? 0) >= estimatedCredits;

  // ── 上传素材到 Supabase Storage ──────────────────────
  const uploadFile = useCallback(async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${folder}/${user.id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, [user]);

  // ── 停止轮询 ─────────────────────────────────────────
  const stopPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ── 轮询任务状态 ─────────────────────────────────────
  const pollStatus = useCallback(async (tid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ad-video-generate', {
        body: { action: 'status', taskId: tid },
      });
      if (error) { const msg = await error?.context?.text(); console.error('poll error:', msg); return; }

      const { taskStatus, progress: p } = data as { taskStatus: string; progress: number };
      setProgress(Math.min(p ?? 50, 95));

      const msgMap: Record<string, string> = {
        QUEUING: '排队等待中…',
        RUNNING: '视频生成中…',
        SUCCESS: '视频生成完成！',
        FAILED: '生成失败',
        CANCELED: '任务已取消',
      };
      setProgressMsg(msgMap[taskStatus] ?? '处理中…');

      if (taskStatus === 'SUCCESS') {
        stopPoll();
        // 获取结果
        const { data: resData } = await supabase.functions.invoke('ad-video-generate', {
          body: { action: 'result', taskId: tid },
        });
        const url = (resData as { videoUrl: string | null })?.videoUrl;
        setVideoUrl(url);
        setProgress(100);
        setProgressMsg('视频已生成！');
        setStep('done');

        // 扣除积分
        await supabase.from('profiles')
          .update({ credits: (profile?.credits ?? 0) - estimatedCredits })
          .eq('id', user!.id);

        toast.success('广告视频生成完成！');
      } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
        stopPoll();
        setStep('error');
        toast.error('视频生成失败，积分已退还');
      }
    } catch (err) {
      console.error('poll exception:', err);
    }
  }, [stopPoll, estimatedCredits, profile, user]);

  // ── 开始生成 ─────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    if (!hasEnoughCredits) { navigate('/pricing'); return; }
    if (!prompt.trim()) { toast.error('请填写广告提示词'); return; }

    setLoading(true);
    setStep('generating');
    setProgress(5);
    setProgressMsg('上传素材中…');

    try {
      // 并行上传素材
      const [productImageUrls, logoUrl, bgmUrl] = await Promise.all([
        Promise.all(productImages.map(f => uploadFile(f, 'products'))),
        logoFile[0] ? uploadFile(logoFile[0], 'logos') : Promise.resolve(null),
        bgmFile[0] ? uploadFile(bgmFile[0], 'bgm') : Promise.resolve(null),
      ]);

      setProgress(20);
      setProgressMsg('提交生成任务…');

      // 提交任务
      const { data, error } = await supabase.functions.invoke('ad-video-generate', {
        body: {
          action: 'submit',
          prompt: prompt.trim(),
          adType,
          style,
          resolution,
          duration,
          realPersonMode,
          productImageUrls: productImageUrls.filter(Boolean),
          logoUrl,
          bgmUrl,
        },
      });

      if (error) {
        const msg = await error?.context?.text();
        throw new Error(msg || '提交失败');
      }

      const tid = (data as { taskId: string }).taskId;
      if (!tid) throw new Error('未获取到任务ID');

      setTaskId(tid);
      setProgress(30);
      setProgressMsg('任务已提交，排队生成中…');

      // 开始轮询
      pollIntervalRef.current = setInterval(() => pollStatus(tid), 3000);

    } catch (err) {
      console.error('startGeneration error:', err);
      setStep('error');
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }, [user, hasEnoughCredits, prompt, adType, style, resolution, duration,
    realPersonMode, productImages, logoFile, bgmFile, uploadFile, pollStatus, navigate]);

  const handleSubmit = () => {
    if (!user) { navigate('/login'); return; }
    if (!prompt.trim()) { toast.error('请填写广告提示词'); return; }
    if (!copyrightAgreed) { setShowCopyrightDialog(true); return; }
    startGeneration();
  };

  const handleReset = () => {
    stopPoll();
    setStep('form');
    setProgress(0);
    setProgressMsg('');
    setTaskId(null);
    setVideoUrl(null);
  };

  const templates = AD_TEMPLATES[adType] ?? [];

  // ── 生成中界面 ────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Megaphone className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold">广告视频生成中</h2>
            <p className="text-sm text-muted-foreground mt-1">{progressMsg}</p>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm font-medium text-primary">{Math.round(progress)}%</p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <p className="flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 预计需要 1-3 分钟，请耐心等待
            </p>
            {taskId && <p className="text-[11px] font-mono text-muted-foreground/50">任务ID：{taskId}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── 完成界面 ──────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          {/* 成功提示 */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-sm">广告视频生成完成！</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                视频链接有效期 <span className="text-amber-400 font-medium">24 小时</span>，请及时下载保存
              </p>
            </div>
          </div>

          {/* 视频预览 */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {videoUrl ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video src={videoUrl} controls className="w-full h-full" playsInline />
                </div>
              ) : (
                <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Play className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">视频预览暂不可用</p>
                  </div>
                </div>
              )}

              {/* 下载按钮 */}
              {videoUrl && (
                <a href={videoUrl} download target="_blank" rel="noreferrer">
                  <Button className="w-full gap-2">
                    <Download className="w-4 h-4" /> 下载视频
                  </Button>
                </a>
              )}

              {/* 适用场景提示 */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {['抖音', '视频号', '小红书', '门店宣传'].map(p => (
                  <Badge key={p} variant="secondary"
                    className="text-xs bg-primary/10 text-primary border-primary/20 rounded-full">
                    {p}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleReset}>
              <RefreshCw className="w-4 h-4" /> 重新制作
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate('/profile/works')}>
              查看作品库
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 错误界面 ──────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold">生成失败</h2>
            <p className="text-sm text-muted-foreground mt-1">抱歉，视频生成遇到问题，已自动退还积分</p>
          </div>
          <Button onClick={handleReset} className="gap-2">
            <RefreshCw className="w-4 h-4" /> 重试
          </Button>
        </div>
      </div>
    );
  }

  // ── 表单界面 ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 页头 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">广告制作</h1>
            <Badge className="bg-primary/15 text-primary border-primary/20 text-xs rounded-full">AI 驱动</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            AI 一键生成专业广告视频，适用于
            <span className="text-foreground font-medium mx-0.5">抖音、视频号、小红书、门店宣传屏</span>
            等场景
          </p>
        </div>

        {/* Step 1：广告类型 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              选择广告类型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {AD_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => { setAdType(type.id); setPrompt(''); }}
                  className={[
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150',
                    adType === type.id
                      ? 'border-primary bg-primary/8 ring-1 ring-primary/30 scale-[1.02]'
                      : 'border-border/60 hover:border-primary/40 hover:bg-muted/40',
                  ].join(' ')}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-xs font-semibold leading-tight">{type.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight hidden md:block">{type.desc}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2：提示词 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                广告内容描述
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs text-primary"
                onClick={() => setShowTemplates(v => !v)}>
                <Sparkles className="w-3.5 h-3.5" />
                预设模板
                {showTemplates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 模板列表 */}
            {showTemplates && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/40">
                <p className="text-xs text-muted-foreground font-medium">一键套用模板：</p>
                <div className="space-y-1.5">
                  {templates.map(tpl => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => { setPrompt(tpl.prompt); setShowTemplates(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-xs font-medium text-foreground">{tpl.name}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{tpl.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="描述你的广告内容、场景、氛围、产品特点等，越详细 AI 生成越准确…"
                className="resize-none min-h-[100px] px-3 text-sm"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" /> 建议包含产品名称、卖点、目标人群、场景氛围
                </p>
                <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3：风格选择 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
              视觉风格
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AD_STYLES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={[
                    'p-3 rounded-xl border text-left transition-all duration-150',
                    style === s.id
                      ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                      : 'border-border/60 hover:border-primary/40 hover:bg-muted/40',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 4：分辨率 & 时长 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
              分辨率 & 时长
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 分辨率 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">输出分辨率</Label>
              <div className="flex gap-2">
                {RESOLUTIONS.map(r => (
                  <button key={r.id} type="button" onClick={() => setResolution(r.id)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${resolution === r.id ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {/* 时长 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">视频时长</Label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} type="button" onClick={() => setDuration(d)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${duration === d ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground'}`}>
                    {d}秒
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 5：上传素材 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">5</span>
              上传素材（可选）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone
              accept="image/jpeg,image/png,image/webp"
              maxSizeMB={10}
              label="产品图片（最多3张）"
              hint="JPG / PNG / WebP，展示产品外观"
              icon={ImageIcon}
              files={productImages}
              onAdd={f => { if (productImages.length < 3) setProductImages(p => [...p, f]); }}
              onRemove={i => setProductImages(p => p.filter((_, idx) => idx !== i))}
              maxFiles={3}
            />
            <FileUploadZone
              accept="image/jpeg,image/png,image/webp"
              maxSizeMB={5}
              label="品牌 Logo"
              hint="JPG / PNG，建议透明背景"
              icon={ImageIcon}
              files={logoFile}
              onAdd={f => setLogoFile([f])}
              onRemove={() => setLogoFile([])}
            />
            <FileUploadZone
              accept="audio/mpeg,audio/mp4,audio/m4a"
              maxSizeMB={20}
              label="背景音乐"
              hint="MP3 / M4A，为广告增添氛围"
              icon={Music}
              files={bgmFile}
              onAdd={f => setBgmFile([f])}
              onRemove={() => setBgmFile([])}
            />
          </CardContent>
        </Card>

        {/* Step 6：高级选项 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">6</span>
              高级选项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/40">
              <div>
                <p className="text-sm font-medium">真人出镜模式</p>
                <p className="text-xs text-muted-foreground mt-0.5">适配真人主播出镜的广告风格</p>
              </div>
              <Switch checked={realPersonMode} onCheckedChange={setRealPersonMode} />
            </div>
          </CardContent>
        </Card>

        {/* 费用确认 + 生成按钮 */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-semibold">本次生成费用</p>
                <p className="text-xs text-muted-foreground">
                  {AD_TYPES.find(t => t.id === adType)?.label} · {AD_STYLES.find(s => s.id === style)?.label} · {duration}秒 · {resolution.toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{estimatedCredits}</p>
                <p className="text-xs text-muted-foreground">积分</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-primary" /> 当前余额：{profile?.credits ?? 0} 积分</span>
              {!hasEnoughCredits && user && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" /> 积分不足
                </span>
              )}
            </div>

            {/* 版权协议 */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Checkbox id="copyright" checked={copyrightAgreed} onCheckedChange={v => setCopyrightAgreed(!!v)} className="mt-0.5 shrink-0" />
              <label htmlFor="copyright" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                我承诺上传的素材（图片、音乐等）拥有完整版权或已获授权，生成内容仅用于合法商业用途，不涉及任何侵权行为
              </label>
            </div>

            {/* 版权警告 */}
            {!copyrightAgreed && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                请勾选版权承诺后才能生成
              </div>
            )}

            <Button
              className="w-full h-12 gap-2 text-base"
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
            >
              {!user ? (
                <><Sparkles className="w-5 h-5" />登录后开始生成</>
              ) : !hasEnoughCredits ? (
                <><Zap className="w-5 h-5" />积分不足，去充值</>
              ) : (
                <><Wand2 className="w-5 h-5" />立即生成广告视频 <span className="text-primary-foreground/70 text-sm">（{estimatedCredits} 积分）</span></>
              )}
            </Button>

            {/* 有效期提醒 */}
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              生成的视频链接有效期 <span className="text-amber-400 font-medium">24 小时</span>，请及时下载保存
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 版权协议弹窗 */}
      <Dialog open={showCopyrightDialog} onOpenChange={setShowCopyrightDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" /> 版权与合规声明
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>生成广告视频前，请确认以下事项：</p>
            <ul className="space-y-2 list-none">
              {['上传的产品图片、Logo、音乐等素材均拥有合法版权或已获授权', '生成内容仅用于合法商业推广目的', '不包含任何违法、违规、侵权内容', '平台对用户上传内容的版权不承担责任'].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCopyrightDialog(false)}>取消</Button>
            <Button onClick={() => {
              setCopyrightAgreed(true);
              setShowCopyrightDialog(false);
              startGeneration();
            }}>
              同意并开始生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
