import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Palette } from 'lucide-react';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PosterGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteLink: string;
  inviteCode: string;
}

const TEMPLATES = [
  { id: 'gradient', name: '炫彩渐变', bg: ['#6366f1', '#a855f7', '#ec4899'], textColor: '#ffffff' },
  { id: 'minimal', name: '极简白', bg: ['#ffffff', '#f8fafc'], textColor: '#0f172a', qrBg: '#f1f5f9' },
  { id: 'dark', name: '极光黑', bg: ['#0f172a', '#1e1b4b'], textColor: '#f8fafc', qrBg: '#1e293b' },
  { id: 'cyber', name: '赛博科技', bg: ['#020617', '#0891b2'], textColor: '#38bdf8', qrBg: '#0f172a', accent: '#fbbf24' }
];

export function PosterGenerator({ open, onOpenChange, inviteLink, inviteCode }: PosterGeneratorProps) {
  const { profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open && qrCodeData) {
      drawPoster();
    }
  }, [open, activeTemplate, qrCodeData]);

  const drawPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // Draw background
    if (activeTemplate.bg.length > 1) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      activeTemplate.bg.forEach((color, index) => {
        gradient.addColorStop(index / (activeTemplate.bg.length - 1), color);
      });
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = activeTemplate.bg[0];
    }
    ctx.fillRect(0, 0, width, height);

    // Draw decorative elements
    if (activeTemplate.id === 'cyber') {
      ctx.strokeStyle = activeTemplate.accent || '#fff';
      ctx.lineWidth = 2;
      for(let i=0; i<width; i+=40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.globalAlpha = 0.05;
        ctx.stroke();
      }
      for(let i=0; i<height; i+=40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.globalAlpha = 0.05;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Draw main content
    ctx.fillStyle = activeTemplate.textColor;
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 100px sans-serif';
    ctx.fillText('加入筑梦呈剧', width / 2, 400);

    // Subtitle
    ctx.font = '500 50px sans-serif';
    ctx.globalAlpha = 0.8;
    ctx.fillText('一键生成AI漫剧，释放你的创造力', width / 2, 520);
    ctx.globalAlpha = 1;

    // Invite Code Box
    const boxWidth = 600;
    const boxHeight = 160;
    const boxX = (width - boxWidth) / 2;
    const boxY = 700;

    // Box background
    ctx.fillStyle = activeTemplate.id === 'minimal' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 20);
    ctx.fill();

    // Box stroke
    if (activeTemplate.accent) {
      ctx.strokeStyle = activeTemplate.accent;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Invite Code Text
    ctx.fillStyle = activeTemplate.textColor;
    ctx.font = '40px sans-serif';
    ctx.fillText('专属邀请码', width / 2, boxY + 60);
    
    ctx.font = 'bold 70px monospace';
    if(activeTemplate.id === 'cyber' && activeTemplate.accent) {
      ctx.fillStyle = activeTemplate.accent;
    }
    ctx.fillText(inviteCode, width / 2, boxY + 135);

    // Load and draw QR Code
    if (qrCodeData) {
      const img = new Image();
      img.onload = () => {
        const qrSize = 400;
        const qrX = (width - qrSize) / 2;
        const qrY = 1100;

        // QR Background
        ctx.fillStyle = activeTemplate.qrBg || '#ffffff';
        ctx.beginPath();
        ctx.roundRect(qrX - 40, qrY - 40, qrSize + 80, qrSize + 80, 40);
        ctx.fill();

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // QR Helper Text
        ctx.fillStyle = activeTemplate.textColor;
        ctx.font = '40px sans-serif';
        ctx.globalAlpha = 0.7;
        ctx.fillText('长按识别二维码或微信扫一扫', width / 2, qrY + qrSize + 120);
        ctx.globalAlpha = 1;

        // User info at bottom
        ctx.font = '36px sans-serif';
        const userName = profile?.username || '神秘小伙伴';
        ctx.fillText(`来自 ${userName} 的邀请`, width / 2, height - 100);
      };
      img.src = qrCodeData;
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    setIsGenerating(true);
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `筑梦呈剧-邀请海报-${inviteCode}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('海报保存成功！');
    } catch (e) {
      console.error(e);
      toast.error('海报保存失败');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>专属邀请海报</DialogTitle>
          <DialogDescription>选择喜欢的模板，保存海报并分享给好友</DialogDescription>
        </DialogHeader>

        {/* Hidden QR Code for canvas generation */}
        <div className="hidden">
          <QRCodeDataUrl 
            text={inviteLink} 
            onDataUrl={setQrCodeData} 
            color={activeTemplate.id === 'minimal' ? '#0f172a' : '#000000'}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-4">
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" /> 选择海报风格
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((tpl) => (
                  <Button
                    key={tpl.id}
                    variant={activeTemplate.id === tpl.id ? "default" : "outline"}
                    className={`h-20 w-full flex flex-col items-center justify-center gap-2 relative overflow-hidden`}
                    onClick={() => setActiveTemplate(tpl)}
                  >
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: tpl.bg.length > 1 
                          ? `linear-gradient(135deg, ${tpl.bg.join(', ')})` 
                          : tpl.bg[0]
                      }}
                    />
                    <span className="relative z-10">{tpl.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full mt-auto gradient-primary-bg border-0 text-white shadow-lg"
              onClick={handleDownload}
              disabled={isGenerating || !qrCodeData}
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
              {isGenerating ? '生成中...' : '保存海报到本地'}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              好友通过识别海报上的二维码注册，双方均可获得20积分奖励
            </p>
          </div>

          <div className="flex items-center justify-center bg-muted/50 rounded-xl p-4 border border-border">
            <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl ring-1 ring-border">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}