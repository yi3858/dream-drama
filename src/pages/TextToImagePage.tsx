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
  ImageIcon, Wand2, Sparkles, Download, Zap, Shield, X,
  AlertTriangle, CheckCircle2, RefreshCw, Copy, ZoomIn, Info,
} from 'lucide-react';

// ─── 常量 ──────────────────────────────────────────────
const STYLES = [
  { id: 'realistic',   label: '写实摄影',   emoji: '📷', desc: '高清真实，专业摄影质感' },
  { id: 'anime',       label: '二次元动漫', emoji: '🎌', desc: '明亮色彩，清晰线条' },
  { id: 'oilpainting', label: '油画插画',   emoji: '🖼️', desc: '厚重笔触，艺术质感' },
  { id: 'cyberpunk',   label: '赛博朋克',   emoji: '🤖', desc: '霓虹未来，暗黑科技' },
  { id: 'chinese',     label: '国风水墨',   emoji: '🏮', desc: '传统笔墨，东方意境' },
  { id: '3d',          label: '3D 渲染',    emoji: '💎', desc: '立体逼真，体积光效' },
  { id: 'pixel',       label: '像素艺术',   emoji: '🕹️', desc: '复古游戏，像素风格' },
  { id: 'sketch',      label: '黑白素描',   emoji: '✏️', desc: '素描线稿，简洁单色' },
];

const RATIOS = [
  { id: '1:1',  label: '1:1',  desc: '方形' },
  { id: '4:3',  label: '4:3',  desc: '横版' },
  { id: '3:4',  label: '3:4',  desc: '竖版' },
  { id: '16:9', label: '16:9', desc: '宽屏' },
  { id: '9:16', label: '9:16', desc: '手机' },
];

const COUNTS = [1, 2, 4];

const QUALITIES = [
  { id: 'standard',  label: '标准',   multiplier: 1.0 },
  { id: 'fine',      label: '精细',   multiplier: 1.5 },
  { id: 'superfine', label: '超精细', multiplier: 2.5 },
];

const BASE_CREDITS_PER_IMAGE = 3;

function calcCredits(count: number, quality: string): number {
  const q = QUALITIES.find(q => q.id === quality) ?? QUALITIES[0];
  return Math.ceil(BASE_CREDITS_PER_IMAGE * count * q.multiplier);
}

// ─── 主页面 ────────────────────────────────────────────
export default function TextToImagePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // 表单
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [ratio, setRatio] = useState('1:1');
  const [count, setCount] = useState(1);
  const [quality, setQuality] = useState('standard');
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  const [showNeg, setShowNeg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 生成状态
  const [step, setStep] = useState<'form' | 'generating' | 'done' | 'error'>('form');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const estimatedCredits = calcCredits(count, quality);
  const hasEnoughCredits = (profile?.credits ?? 0) >= estimatedCredits;

  const stopPoll = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
  }, []);

  const pollStatus = useCallback(async (tid: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-image', {
        body: { action: 'status', taskId: tid },
      });
      if (error) { const m = await error?.context?.text(); console.error('poll:', m); return; }

      const { taskStatus, progress: p } = data as { taskStatus: string; progress: number };
      setProgress(Math.min(p ?? 50, 95));

      const msgMap: Record<string, string> = {
        QUEUING: '排队等待中…', RUNNING: '图片生成中…',
        SUCCESS: '生成完成！', FAILED: '生成失败', CANCELED: '任务已取消',
      };
      setProgressMsg(msgMap[taskStatus] ?? '处理中…');

      if (taskStatus === 'SUCCESS') {
        stopPoll();
        const { data: res } = await supabase.functions.invoke('text-to-image', {
          body: { action: 'result', taskId: tid },
        });
        const urls = (res as { imageUrls: string[] })?.imageUrls ?? [];
        setImageUrls(urls);
        setProgress(100);
        setProgressMsg('图片生成完成！');
        setStep('done');
        // 扣除积分
        await supabase.from('profiles')
          .update({ credits: (profile?.credits ?? 0) - estimatedCredits })
          .eq('id', user!.id);
        toast.success(`已生成 ${urls.length} 张图片！`);
      } else if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
        stopPoll(); setStep('error');
        toast.error('图片生成失败，积分已退还');
      }
    } catch (err) { console.error('poll exception:', err); }
  }, [stopPoll, estimatedCredits, profile, user]);

  const startGeneration = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    if (!hasEnoughCredits) { navigate('/pricing'); return; }
    if (!prompt.trim()) { toast.error('请填写提示词'); return; }

    setLoading(true);
    setStep('generating');
    setProgress(10);
    setProgressMsg('提交生成任务…');

    try {
      const { data, error } = await supabase.functions.invoke('text-to-image', {
        body: { action: 'submit', prompt: prompt.trim(), negativePrompt, style, ratio, count, quality },
      });

      if (error) { const m = await error?.context?.text(); throw new Error(m || '提交失败'); }

      const tid = (data as { taskId: string }).taskId;
      if (!tid) throw new Error('未获取到任务ID');

      setProgress(25);
      setProgressMsg('任务已提交，排队生成中…');
      pollIntervalRef.current = setInterval(() => pollStatus(tid), 3000);
    } catch (err) {
      setStep('error');
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }, [user, hasEnoughCredits, prompt, negativePrompt, style, ratio, count, quality, pollStatus, navigate]);

  const handleSubmit = () => {
    if (!user) { navigate('/login'); return; }
    if (!prompt.trim()) { toast.error('请填写提示词'); return; }
    if (!copyrightAgreed) { setShowCopyrightDialog(true); return; }
    startGeneration();
  };

  const handleReset = () => {
    stopPoll();
    setStep('form'); setProgress(0); setProgressMsg(''); setImageUrls([]);
  };

  // ── 生成中 ────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ImageIcon className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold">图片生成中</h2>
            <p className="text-sm text-muted-foreground mt-1">{progressMsg}</p>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm font-medium text-primary">{Math.round(progress)}%</p>
          </div>
          <p className="text-xs text-muted-foreground">预计需要 30 秒 ~ 2 分钟</p>
        </div>
      </div>
    );
  }

  // ── 完成 ──────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <p className="font-medium text-sm">图片生成完成！共 {imageUrls.length} 张</p>
          </div>

          {/* 图片网格 */}
          <div className={`grid gap-3 ${imageUrls.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {imageUrls.map((url, i) => (
              <div key={i} className="relative group aspect-square bg-muted/30 rounded-xl overflow-hidden border border-border/50">
                <img src={url} alt={`生成图片 ${i + 1}`} className="w-full h-full object-cover" />
                {/* hover 操作层 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(url)}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ZoomIn className="w-5 h-5 text-white" />
                  </button>
                  <a
                    href={url} download target="_blank" rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <Download className="w-5 h-5 text-white" />
                  </a>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(prompt); toast.success('提示词已复制'); }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <Copy className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleReset}>
              <RefreshCw className="w-4 h-4" /> 继续生成
            </Button>
            {imageUrls.length > 0 && (
              <a href={imageUrls[0]} download target="_blank" rel="noreferrer" className="flex-1">
                <Button className="w-full gap-2"><Download className="w-4 h-4" /> 下载全部</Button>
              </a>
            )}
          </div>
        </div>

        {/* 放大预览弹窗 */}
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl p-2 bg-black/90 border-border/40">
            <button type="button" onClick={() => setPreviewUrl(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
            {previewUrl && <img src={previewUrl} alt="预览" className="w-full rounded-lg object-contain max-h-[80vh]" />}
          </DialogContent>
        </Dialog>
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
              <ImageIcon className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">文生图</h1>
            <Badge className="bg-primary/15 text-primary border-primary/20 text-xs rounded-full">AI 驱动</Badge>
          </div>
          <p className="text-sm text-muted-foreground">输入文字描述，AI 一键生成精美图片</p>
        </div>

        {/* Step 1：提示词 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              描述你想要的画面
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="描述画面内容，如：一只橙色小猫坐在樱花树下，阳光洒落，柔美氛围…"
                className="resize-none min-h-[90px] px-3 text-sm"
                maxLength={500}
              />
              <div className="flex justify-between">
                <button type="button" className="text-xs text-primary flex items-center gap-1"
                  onClick={() => setShowNeg(v => !v)}>
                  <Info className="w-3 h-3" /> {showNeg ? '收起' : '添加反向提示词（排除不想要的元素）'}
                </button>
                <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
              </div>
            </div>
            {showNeg && (
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-muted-foreground">反向提示词（可选）</Label>
                <Textarea
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  placeholder="如：模糊、低质量、变形、水印…"
                  className="resize-none min-h-[60px] px-3 text-sm"
                  maxLength={300}
                />
                <p className="text-right text-xs text-muted-foreground">{negativePrompt.length}/300</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2：风格 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
              选择画面风格
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STYLES.map(s => (
                <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                  className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                    style === s.id
                      ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                      : 'border-border/60 hover:border-primary/40 hover:bg-muted/40'
                  }`}>
                  <div className="text-xl mb-1">{s.emoji}</div>
                  <p className="text-xs font-semibold leading-tight">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 hidden md:block">{s.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 3：参数 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
              图片参数
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 比例 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">图片比例</Label>
              <div className="flex flex-wrap gap-2">
                {RATIOS.map(r => (
                  <button key={r.id} type="button" onClick={() => setRatio(r.id)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      ratio === r.id ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground'
                    }`}>
                    {r.label} <span className="text-[11px] opacity-60">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* 数量 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">生成数量</Label>
              <div className="flex gap-2">
                {COUNTS.map(c => (
                  <button key={c} type="button" onClick={() => setCount(c)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      count === c ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground'
                    }`}>
                    {c} 张
                  </button>
                ))}
              </div>
            </div>
            {/* 精细度 */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-normal">精细度</Label>
              <div className="flex gap-2">
                {QUALITIES.map(q => (
                  <button key={q.id} type="button" onClick={() => setQuality(q.id)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      quality === q.id ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 hover:border-primary/30 text-muted-foreground'
                    }`}>
                    {q.label}
                    <span className="text-[10px] block text-muted-foreground">×{q.multiplier}</span>
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
                  {count} 张 · {QUALITIES.find(q => q.id === quality)?.label} · {STYLES.find(s => s.id === style)?.label}
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

            {/* 版权 */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Checkbox id="cp" checked={copyrightAgreed} onCheckedChange={v => setCopyrightAgreed(!!v)} className="mt-0.5 shrink-0" />
              <label htmlFor="cp" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                我承诺生成内容仅用于合法用途，不包含任何违法或侵权内容
              </label>
            </div>

            <Button className="w-full h-11 gap-2 text-base" onClick={handleSubmit} disabled={loading || !prompt.trim()}>
              {!user ? (
                <><Sparkles className="w-5 h-5" />登录后开始生成</>
              ) : !hasEnoughCredits ? (
                <><Zap className="w-5 h-5" />积分不足，去充值</>
              ) : (
                <><Wand2 className="w-5 h-5" />立即生成 <span className="text-primary-foreground/70 text-sm">（{estimatedCredits} 积分）</span></>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 版权弹窗 */}
      <Dialog open={showCopyrightDialog} onOpenChange={setShowCopyrightDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" /> 合规声明
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>生成内容仅用于合法合规目的，不包含违法、暴力、色情等内容。</p>
          </div>
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
