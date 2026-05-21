import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  Video, Wand2, Sparkles, Download, Zap, Shield,
  AlertTriangle, CheckCircle2, RefreshCw, Clock, Play,
  ImageIcon, X,
} from 'lucide-react';

// ─── 常量 ──────────────────────────────────────────────
const MOTION_STRENGTHS = [
  { id: 'light',  label: '轻微', desc: '细微抖动，自然呼吸感' },
  { id: 'medium', label: '中等', desc: '明显运动，活泼自然' },
  { id: 'strong', label: '强烈', desc: '大幅动感，震撼视觉' },
];

const DURATIONS = [
  { value: 3, label: '3 秒', multiplier: 1.0 },
  { value: 5, label: '5 秒', multiplier: 1.5 },
  { value: 8, label: '8 秒', multiplier: 2.2 },
];

const RESOLUTIONS = [
  { id: '480p',  label: '480P',  multiplier: 0.6 },
  { id: '720p',  label: '720P',  multiplier: 1.0 },
  { id: '1080p', label: '1080P', multiplier: 1.8 },
];

const VIDEO_STYLES = [
  { id: 'realistic', label: '写实',   desc: '真实感，自然流畅' },
  { id: 'anime',     label: '动漫',   desc: '二次元，流畅动画' },
  { id: 'cinematic', label: '电影感', desc: '电影质感，大片氛围' },
];

const BASE_CREDITS = 10;
const BUCKET = 'ad-assets';

function calcCredits(duration: number, resolution: string): number {
  const dur = DURATIONS.find(d => d.value === duration) ?? DURATIONS[0];
  const res = RESOLUTIONS.find(r => r.id === resolution) ?? RESOLUTIONS[1];
  return Math.ceil(BASE_CREDITS * dur.multiplier * res.multiplier);
}

// ─── 主页面 ────────────────────────────────────────────
export default function ImageToVideoPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // 表单
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [motionPrompt, setMotionPrompt] = useState('');
  const [motionStrength, setMotionStrength] = useState('medium');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('720p');
  const [videoStyle, setVideoStyle] = useState('realistic');
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成状态
  const [step, setStep] = useState<'form' | 'generating' | 'done' | 'error'>('form');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const estimatedCredits = calcCredits(duration, resolution);
  const hasEnoughCredits = (profile?.credits ?? 0) >= estimatedCredits;

  const stopPoll = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('图片不能超过 10MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('请上传图片文件'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const pollStatus = useCallback(async (tid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('image-to-video', {
        body: { action: 'status', taskId: tid },
      });
      if (error) { const m = await error?.context?.text(); console.error('poll:', m); return; }

      const { taskStatus, progress: p } = data as { taskStatus: string; progress: number };
      setProgress(Math.min(p ?? 50, 95));

      const msgMap: Record<string, string> = {
        QUEUING: '排队等待中…', RUNNING: '视频生成中…',
        SUCCESS: '生成完成！', FAILED: '生成失败', CANCELED: '任务已取消',
      };
      setProgressMsg(msgMap[taskStatus] ?? '处理中…');

      if (taskStatus === 'SUCCESS') {
        stopPoll();
        const { data: res } = await supabase.functions.invoke('image-to-video', {
          body: { action: 'result', taskId: tid },
        });
        const url = (res as { videoUrl: string | null })?.videoUrl;
        setVideoUrl(url);
        setProgress(100);
        setProgressMsg('视频生成完成！');
        setStep('done');
        await supabase.from('profiles')
          .update({ credits: (profile?.credits ?? 0) - estimatedCredits })
          .eq('id', user!.id);
        toast.success('图生视频完成！');
      } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
        stopPoll(); setStep('error');
        toast.error('生成失败，积分已退还');
      }
    } catch (err) { console.error('poll exception:', err); }
  }, [stopPoll, estimatedCredits, profile, user]);

  const startGeneration = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    if (!hasEnoughCredits) { navigate('/pricing'); return; }
    if (!imageFile) { toast.error('请上传参考图片'); return; }

    setLoading(true);
    setStep('generating');
    setProgress(10);
    setProgressMsg('上传参考图片…');

    try {
      // 上传参考图
      const ext = imageFile.name.split('.').pop() ?? 'jpg';
      const path = `i2v/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, imageFile, { cacheControl: '3600', upsert: false });
      if (upErr) throw new Error('图片上传失败');

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      setProgress(25);
      setProgressMsg('提交生成任务…');

      const { data, error } = await supabase.functions.invoke('image-to-video', {
        body: { action: 'submit', imageUrl, motionPrompt, motionStrength, duration, resolution, videoStyle },
      });

      if (error) { const m = await error?.context?.text(); throw new Error(m || '提交失败'); }

      const tid = (data as { taskId: string }).taskId;
      if (!tid) throw new Error('未获取到任务ID');

      setProgress(35);
      setProgressMsg('任务已提交，排队生成中…');
      pollIntervalRef.current = setInterval(() => pollStatus(tid), 3000);
    } catch (err) {
      setStep('error');
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }, [user, hasEnoughCredits, imageFile, motionPrompt, motionStrength, duration, resolution, videoStyle, pollStatus, navigate]);

  const handleSubmit = () => {
    if (!user) { navigate('/login'); return; }
    if (!imageFile) { toast.error('请上传参考图片'); return; }
    if (!copyrightAgreed) { setShowCopyrightDialog(true); return; }
    startGeneration();
  };

  const handleReset = () => {
    stopPoll();
    setStep('form'); setProgress(0); setProgressMsg(''); setVideoUrl(null);
  };

  // ── 生成中 ────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Video className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold">视频生成中</h2>
            <p className="text-sm text-muted-foreground mt-1">{progressMsg}</p>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm font-medium text-primary">{Math.round(progress)}%</p>
          </div>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> 预计需要 1~3 分钟
          </p>
        </div>
      </div>
    );
  }

  // ── 完成 ──────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-sm">视频生成完成！</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                视频链接有效期 <span className="text-amber-400 font-medium">24 小时</span>，请及时下载保存
              </p>
            </div>
          </div>

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
              {videoUrl && (
                <a href={videoUrl} download target="_blank" rel="noreferrer">
                  <Button className="w-full gap-2"><Download className="w-4 h-4" /> 下载视频</Button>
                </a>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleReset}>
              <RefreshCw className="w-4 h-4" /> 重新生成
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 错误 ──────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold">生成失败</h2>
            <p className="text-sm text-muted-foreground mt-1">积分已退还，请重试</p>
          </div>
          <Button onClick={handleReset} className="gap-2"><RefreshCw className="w-4 h-4" /> 重试</Button>
        </div>
      </div>
    );
  }

  // ── 表单 ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 页头 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Video className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">图生视频</h1>
            <Badge className="bg-primary/15 text-primary border-primary/20 text-xs rounded-full">AI 驱动</Badge>
          </div>
          <p className="text-sm text-muted-foreground">上传一张图片，AI 让它动起来</p>
        </div>

        {/* Step 1：上传图片 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              上传参考图片
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!imagePreview ? (
              <div
                className="border-2 border-dashed border-border/60 hover:border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onDragOver={e => e.preventDefault()}
              >
                <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">点击或拖拽上传图片</p>
                <p className="text-xs text-muted-foreground/60 mt-1">JPG / PNG · 最大 10MB</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border/50">
                <img src={imagePreview} alt="参考图片" className="w-full max-h-64 object-contain bg-muted/20" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }} />
          </CardContent>
        </Card>

        {/* Step 2：运动描述 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
              运动描述（可选）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Textarea
                value={motionPrompt}
                onChange={e => setMotionPrompt(e.target.value)}
                placeholder="描述图片如何动起来，如：树枝轻轻摇曳，光线缓缓移动，水面泛起涟漪…"
                className="resize-none min-h-[70px] px-3 text-sm"
                maxLength={300}
              />
              <p className="text-right text-xs text-muted-foreground">{motionPrompt.length}/300</p>
            </div>

            {/* 运动强度 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">运动强度</Label>
              <div className="grid grid-cols-3 gap-2">
                {MOTION_STRENGTHS.map(s => (
                  <button key={s.id} type="button" onClick={() => setMotionStrength(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      motionStrength === s.id
                        ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                        : 'border-border/60 hover:border-primary/40 hover:bg-muted/40'
                    }`}>
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3：视频参数 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
              视频参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 分辨率 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">分辨率</Label>
              <div className="flex gap-2">
                {RESOLUTIONS.map(r => (
                  <button key={r.id} type="button" onClick={() => setResolution(r.id)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      resolution === r.id ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground'
                    }`}>
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
                  <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      duration === d.value ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            {/* 风格 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">视频风格</Label>
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_STYLES.map(s => (
                  <button key={s.id} type="button" onClick={() => setVideoStyle(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      videoStyle === s.id
                        ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                        : 'border-border/60 hover:border-primary/40 hover:bg-muted/40'
                    }`}>
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 费用 + 生成 */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">本次消耗</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {duration}秒 · {resolution.toUpperCase()} · {VIDEO_STYLES.find(s => s.id === videoStyle)?.label}
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
              <Checkbox id="cp2" checked={copyrightAgreed} onCheckedChange={v => setCopyrightAgreed(!!v)} className="mt-0.5 shrink-0" />
              <label htmlFor="cp2" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                我承诺上传的图片拥有合法版权，生成内容仅用于合法用途
              </label>
            </div>

            <Button className="w-full h-11 gap-2 text-base" onClick={handleSubmit} disabled={loading || !imageFile}>
              {!user ? (
                <><Sparkles className="w-5 h-5" />登录后开始生成</>
              ) : !hasEnoughCredits ? (
                <><Zap className="w-5 h-5" />积分不足，去充值</>
              ) : (
                <><Wand2 className="w-5 h-5" />立即生成视频 <span className="text-primary-foreground/70 text-sm">（{estimatedCredits} 积分）</span></>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              生成的视频链接有效期 <span className="text-amber-400 font-medium">24 小时</span>，请及时下载保存
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 版权弹窗 */}
      <Dialog open={showCopyrightDialog} onOpenChange={setShowCopyrightDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" /> 版权声明
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">我承诺上传的图片拥有合法版权，生成内容仅用于合法商业用途。</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCopyrightDialog(false)}>取消</Button>
            <Button onClick={() => { setCopyrightAgreed(true); setShowCopyrightDialog(false); startGeneration(); }}>
              同意并生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
