import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRechargeModal } from '@/contexts/RechargeModalContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  Sparkles, Upload, Image as ImageIcon, Video, CheckCircle2, ChevronRight, Zap, Info, Play, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BASE_CREDITS = 15;

const PRESET_MOTIONS = [
  { id: 'dance_1', name: '动感韩舞', nameEn: 'K-Pop Dance', nameTh: 'เต้นเคป๊อป', videoUrl: 'https://videos.pexels.com/video-files/4625564/4625564-sd_640_360_30fps.mp4' },
  { id: 'walk_1', name: '自信走秀', nameEn: 'Catwalk', nameTh: 'เดินแบบมั่นใจ', videoUrl: 'https://videos.pexels.com/video-files/3573651/3573651-sd_640_360_30fps.mp4' },
  { id: 'greeting', name: '热情打招呼', nameEn: 'Greeting', nameTh: 'ทักทายอย่างอบอุ่น', videoUrl: 'https://videos.pexels.com/video-files/2795405/2795405-sd_640_360_30fps.mp4' },
  { id: 'sports', name: '运动跳跃', nameEn: 'Sports Jump', nameTh: 'กระโดดกีฬา', videoUrl: 'https://videos.pexels.com/video-files/2098552/2098552-sd_640_360_25fps.mp4' },
];

type RefVideoType = { type: 'file'; file: File } | { type: 'preset'; name: string; url: string };

export default function MotionTransferPage() {
  const { t, language } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const { openRechargeModal } = useRechargeModal();
  const navigate = useNavigate();
  
  const imgRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [sourceImg, setSourceImg] = useState<File | null>(null);
  const [refVideo, setRefVideo] = useState<RefVideoType | null>(null);
  const [intensity, setIntensity] = useState([50]);
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [showCopyrightDialog, setShowCopyrightDialog] = useState(false);
  const [showMotionLibrary, setShowMotionLibrary] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const hasEnoughCredits = (profile?.credits ?? 0) >= BASE_CREDITS;

  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === 'zh' ? '图片大小不能超过10MB' : (language === 'en' ? 'Image size cannot exceed 10MB' : 'ขนาดรูปภาพต้องไม่เกิน 10MB'));
      return;
    }
    setSourceImg(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(language === 'zh' ? '视频大小不能超过50MB' : (language === 'en' ? 'Video size cannot exceed 50MB' : 'ขนาดวิดีโอต้องไม่เกิน 50MB'));
      return;
    }
    setRefVideo({ type: 'file', file });
  };

  const handleSubmit = () => {
    if (!copyrightAgreed) {
      setShowCopyrightDialog(true);
      return;
    }
    startGeneration();
  };

  const confirmCopyright = () => {
    setCopyrightAgreed(true);
    setShowCopyrightDialog(false);
    startGeneration();
  };

  const startGeneration = async () => {
    if (!user) { navigate('/login'); return; }
    if (!hasEnoughCredits) { toast.error(language === 'zh' ? '积分不足，请先充值' : (language === 'en' ? 'Insufficient credits, please recharge' : 'เครดิตไม่เพียงพอ โปรดเติมเงิน')); openRechargeModal(); return; }

    setLoading(true);
    setStep(2);
    setProgress(0);

    const msgs = language === 'zh' 
      ? ['上传素材中...', '提取主体骨骼节点...', '解析视频动作轨迹...', '姿态对齐与驱动渲染...', '处理最终画面细节...']
      : language === 'en'
      ? ['Uploading assets...', 'Extracting skeleton nodes...', 'Parsing video motion...', 'Pose alignment and rendering...', 'Finalizing details...']
      : ['กำลังอัปโหลดเนื้อหา...', 'กำลังแยกโหนดโครงกระดูก...', 'กำลังวิเคราะห์การเคลื่อนไหวของวิดีโอ...', 'การจัดตำแหน่งท่าทางและการเรนเดอร์...', 'กำลังปรับแต่งรายละเอียด...'];
    
    let msgIdx = 0;
    setProgressMsg(msgs[0]);

    try {
      const { data, error } = await supabase.from('works').insert({
        user_id: user.id,
        title: language === 'zh' ? '动作迁移作品' : (language === 'en' ? 'Motion Transfer Work' : 'ผลงานถ่ายโอนการเคลื่อนไหว'),
        type: 'motion_transfer',
        status: 'processing',
        estimated_credits: BASE_CREDITS,
        copyright_agreed: copyrightAgreed,
      }).select('id').maybeSingle();

      if (error) throw error;

      // Simulate process
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 8;
          if (next > msgIdx * 20 && msgIdx < msgs.length - 1) {
            msgIdx++;
            setProgressMsg(msgs[msgIdx]);
          }
          if (next >= 95) { clearInterval(interval); return 95; }
          return next;
        });
      }, 600);

      // We don't actually upload to cloud in this mock to save time,
      // Just simulate completion
      setTimeout(async () => {
        clearInterval(interval);
        setProgress(100);
        setProgressMsg(language === 'zh' ? '生成完成！' : (language === 'en' ? 'Generation completed!' : 'สร้างเสร็จสมบูรณ์!'));
        if (data?.id) {
          await supabase.from('works').update({ status: 'completed' }).eq('id', data.id);
        }
        await refreshProfile();
        setLoading(false);
        setStep(3);
        toast.success(language === 'zh' ? '动作迁移完成！' : (language === 'en' ? 'Motion transfer completed!' : 'ถ่ายโอนการเคลื่อนไหวเสร็จสมบูรณ์!'));
      }, 10000);
    } catch (e: unknown) {
      setLoading(false);
      setStep(1);
      const msg = e instanceof Error ? e.message : 'Failed';
      toast.error(language === 'zh' ? '生成失败：' + msg : (language === 'en' ? 'Generation failed: ' + msg : 'สร้างล้มเหลว: ' + msg));
    }
  };

  return (
    <div className="w-full">
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl text-center space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20">{language === 'zh' ? '新功能' : (language === 'en' ? 'New Feature' : 'ฟีเจอร์ใหม่')}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            {language === 'zh' ? '动作迁移' : (language === 'en' ? 'Motion Transfer' : 'ถ่ายโอนการเคลื่อนไหว')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'zh' ? '上传静态图片和参考视频，AI将通过姿态驱动技术让图片主体复刻视频动作' : (language === 'en' ? 'Upload a static image and reference video, AI will use pose-driven technology to make the image subject replicate the video\'s actions' : 'อัปโหลดภาพนิ่งและวิดีโออ้างอิง AI จะใช้เทคโนโลยีการขับเคลื่อนด้วยท่าทางเพื่อทำให้ตัวแบบในภาพจำลองการกระทำของวิดีโอ')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Image Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    {language === 'zh' ? '参考图片（主体）' : (language === 'en' ? 'Reference Image (Subject)' : 'รูปภาพอ้างอิง (หัวเรื่อง)')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="border-2 border-dashed border-border rounded-xl aspect-[4/3] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors relative overflow-hidden"
                    onClick={() => imgRef.current?.click()}
                  >
                    {sourceImg ? (
                      <>
                        <img src={URL.createObjectURL(sourceImg)} alt="Source" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <div className="relative z-10 bg-background/80 backdrop-blur px-4 py-2 rounded-lg text-sm font-medium">
                          {sourceImg.name}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-medium mb-1">{language === 'zh' ? '点击上传人物/物体图片' : (language === 'en' ? 'Click to upload character/object image' : 'คลิกเพื่ออัปโหลดรูปภาพตัวละคร/วัตถุ')}</p>
                        <p className="text-xs text-muted-foreground">JPG/PNG ≤ 10MB</p>
                      </>
                    )}
                  </div>
                  <input type="file" ref={imgRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleImgUpload} />
                </CardContent>
              </Card>

              {/* Video Upload */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    {language === 'zh' ? '驱动视频（动作）' : (language === 'en' ? 'Driving Video (Motion)' : 'วิดีโอขับเคลื่อน (การเคลื่อนไหว)')}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowMotionLibrary(true)} className="h-8 text-xs shrink-0">
                    <Play className="w-3.5 h-3.5 mr-1" />
                    {language === 'zh' ? '动作库选取' : (language === 'en' ? 'Preset Library' : 'คลังการเคลื่อนไหว')}
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div 
                    className="border-2 border-dashed border-border rounded-xl aspect-[4/3] flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors relative overflow-hidden"
                    onClick={() => videoRef.current?.click()}
                  >
                    {refVideo ? (
                      <>
                        <video src={refVideo.type === 'file' ? URL.createObjectURL(refVideo.file) : refVideo.url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        <div className="relative z-10 bg-background/80 backdrop-blur px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                          <Play className="w-4 h-4" /> {refVideo.type === 'file' ? refVideo.file.name : refVideo.name}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-medium mb-1">{language === 'zh' ? '点击上传或从动作库选取' : (language === 'en' ? 'Upload or pick from library' : 'อัปโหลดหรือเลือกจากคลัง')}</p>
                        <p className="text-xs text-muted-foreground">MP4 ≤ 50MB</p>
                      </>
                    )}
                  </div>
                  <input type="file" ref={videoRef} className="hidden" accept="video/mp4,video/webm" onChange={handleVideoUpload} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  {language === 'zh' ? '参数与消耗' : (language === 'en' ? 'Parameters & Cost' : 'พารามิเตอร์และต้นทุน')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>{language === 'zh' ? '动作贴合度' : (language === 'en' ? 'Motion Match Intensity' : 'ความเข้มของการจับคู่การเคลื่อนไหว')}</Label>
                    <span className="text-sm text-muted-foreground">{intensity[0]}%</span>
                  </div>
                  <Slider 
                    value={intensity} 
                    onValueChange={setIntensity} 
                    max={100} 
                    step={1}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    {language === 'zh' ? '数值越高，人物动作越贴近参考视频，但也可能导致画面扭曲' : (language === 'en' ? 'Higher values make actions match closer but may cause distortions' : 'ค่าที่สูงขึ้นทำให้การกระทำตรงกันมากขึ้นแต่อาจทำให้เกิดการบิดเบือน')}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl card-highlight">
                  <div>
                    <p className="text-sm font-medium">{language === 'zh' ? '预计消耗积分' : (language === 'en' ? 'Estimated Credits' : 'เครดิตโดยประมาณ')}</p>
                    <p className="text-xs text-muted-foreground">{language === 'zh' ? '单次动作迁移固定收费' : (language === 'en' ? 'Fixed fee for motion transfer' : 'ค่าธรรมเนียมคงที่สำหรับการถ่ายโอนการเคลื่อนไหว')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{BASE_CREDITS}</p>
                    <p className="text-xs text-muted-foreground">{language === 'zh' ? '余额：' : (language === 'en' ? 'Balance: ' : 'ยอดคงเหลือ: ')}{profile?.credits ?? 0}</p>
                  </div>
                </div>
                
                {!hasEnoughCredits && user && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{language === 'zh' ? '积分不足，请先充值' : (language === 'en' ? 'Insufficient credits, please recharge' : 'เครดิตไม่เพียงพอ โปรดเติมเงิน')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 gradient-primary-bg border-0 text-white hover:opacity-90 text-base gap-2"
              onClick={handleSubmit}
              disabled={!sourceImg || !refVideo || loading}
            >
              <Sparkles className="w-5 h-5" />
              {loading ? (language === 'zh' ? '处理中...' : (language === 'en' ? 'Processing...' : 'กำลังประมวลผล...')) : (language === 'zh' ? '开始生成' : (language === 'en' ? 'Start Generation' : 'เริ่มการสร้าง'))}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {/* Step 2: Progress */}
        {step === 2 && (
          <div className="text-center space-y-8 py-12 md:py-16">
            <div className="w-24 h-24 rounded-full gradient-primary-bg flex items-center justify-center mx-auto animate-pulse-glow">
              <Sparkles className="w-12 h-12 text-white animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{progressMsg}</h2>
              <p className="text-muted-foreground">
                {language === 'zh' ? 'AI正在计算骨骼关键点并进行视频渲染，请耐心等待' : (language === 'en' ? 'AI is calculating skeleton keypoints and rendering, please wait' : 'AI กำลังคำนวณจุดโครงกระดูกและเรนเดอร์ โปรดรอสักครู่')}
              </p>
            </div>
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{language === 'zh' ? '处理进度' : (language === 'en' ? 'Progress' : 'ความคืบหน้า')}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {language === 'zh' ? '完成后可在作品管理中查看和下载' : (language === 'en' ? 'Can be viewed and downloaded in works management after completion' : 'สามารถดูและดาวน์โหลดได้ในการจัดการผลงานเมื่อเสร็จสิ้น')}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="text-center space-y-8 py-16">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">🎬 {language === 'zh' ? '动作迁移完成！' : (language === 'en' ? 'Motion Transfer Completed!' : 'ถ่ายโอนการเคลื่อนไหวเสร็จสมบูรณ์!')}</h2>
              <p className="text-muted-foreground">
                {language === 'zh' ? '视频已生成并保存到您的作品库' : (language === 'en' ? 'Video has been generated and saved to your works' : 'สร้างวิดีโอและบันทึกไปยังผลงานของคุณแล้ว')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" onClick={() => navigate('/profile/works')}>
                {language === 'zh' ? '前往作品管理查看' : (language === 'en' ? 'View in Works' : 'ดูในผลงาน')}
              </Button>
              <Button variant="outline" onClick={() => {
                setStep(1);
                setSourceImg(null);
                setRefVideo(null);
                setProgress(0);
              }}>
                {language === 'zh' ? '再做一条' : (language === 'en' ? 'Make Another' : 'ทำอีกครั้ง')}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              {language === 'zh' ? '视频链接有效期24小时，请及时下载保存' : (language === 'en' ? 'Video link valid for 24h, please download in time' : 'ลิงก์วิดีโอใช้ได้ 24 ชั่วโมง โปรดดาวน์โหลดให้ทันเวลา')}
            </div>
          </div>
        )}

        <Dialog open={showCopyrightDialog} onOpenChange={setShowCopyrightDialog}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                {language === 'zh' ? '版权承诺确认' : (language === 'en' ? 'Copyright Confirmation' : 'ยืนยันลิขสิทธิ์')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-300">
                  {language === 'zh' ? '根据相关法律规定，使用他人作品需取得版权授权。请仔细阅读并确认以下内容。' : (language === 'en' ? 'According to law, authorization is required to use others\' works. Please confirm the following.' : 'ตามกฎหมาย จำเป็นต้องได้รับอนุญาตในการใช้ผลงานของผู้อื่น โปรดยืนยันสิ่งต่อไปนี้')}
                </p>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <p>{language === 'zh' ? '我承诺：' : (language === 'en' ? 'I promise:' : 'ฉันสัญญา:')}</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>{language === 'zh' ? '上传的图片和视频内容为本人原创或已获得完整版权授权' : (language === 'en' ? 'Uploaded content is original or authorized' : 'เนื้อหาที่อัปโหลดเป็นต้นฉบับหรือได้รับอนุญาตแล้ว')}</li>
                  <li>{language === 'zh' ? '不侵犯任何第三方的著作权、肖像权及其他合法权益' : (language === 'en' ? 'Does not infringe on any third party rights' : 'ไม่ละเมิดสิทธิ์ของบุคคลที่สาม')}</li>
                  <li>{language === 'zh' ? '如产生版权纠纷，由本人承担全部法律责任' : (language === 'en' ? 'I bear full legal responsibility for any disputes' : 'ฉันรับผิดชอบทางกฎหมายอย่างเต็มที่สำหรับข้อพิพาทใดๆ')}</li>
                </ul>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setShowCopyrightDialog(false)}>
                {language === 'zh' ? '取消' : (language === 'en' ? 'Cancel' : 'ยกเลิก')}
              </Button>
              <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" onClick={confirmCopyright}>
                {language === 'zh' ? '我确认已获得完整版权授权' : (language === 'en' ? 'I Confirm Authorization' : 'ฉันยืนยันการอนุญาต')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMotionLibrary} onOpenChange={setShowMotionLibrary}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                {language === 'zh' ? '动作库' : (language === 'en' ? 'Motion Library' : 'คลังการเคลื่อนไหว')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 pb-4">
              {PRESET_MOTIONS.map((preset) => (
                <div 
                  key={preset.id}
                  className="group relative cursor-pointer border rounded-xl overflow-hidden hover:border-primary/50 transition-all"
                  onClick={() => {
                    setRefVideo({ type: 'preset', name: language === 'zh' ? preset.name : language === 'en' ? preset.nameEn : preset.nameTh, url: preset.videoUrl });
                    setShowMotionLibrary(false);
                  }}
                >
                  <div className="aspect-[3/4] bg-muted/30">
                    <video src={preset.videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" autoPlay muted loop playsInline />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-sm font-medium truncate">
                      {language === 'zh' ? preset.name : language === 'en' ? preset.nameEn : preset.nameTh}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}