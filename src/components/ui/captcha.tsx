import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaptchaProps {
  onSuccess: (isValid: boolean) => void;
  width?: number;
  height?: number;
}

export function Captcha({ onSuccess, width = 120, height = 40 }: CaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);

  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let newCode = '';
    for (let i = 0; i < 4; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(newCode);
    setTimeLeft(60);
    onSuccess(false); // 重置验证状态
    setInputValue('');
  }, [onSuccess]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      generateCode();
    }
  }, [timeLeft, generateCode]);

  const drawCaptcha = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 背景色
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // 绘制干扰线
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255}, 0.5)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // 绘制干扰点
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255}, 0.8)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 绘制文字
    for (let i = 0; i < code.length; i++) {
      ctx.font = `bold ${20 + Math.random() * 8}px sans-serif`;
      ctx.fillStyle = `rgb(${Math.random() * 150},${Math.random() * 150},${Math.random() * 150})`;
      
      const x = 10 + i * (width / 4 - 5);
      const y = height / 2 + 10 + Math.random() * 5;
      
      ctx.save();
      // 随机旋转
      const angle = (Math.random() - 0.5) * 0.4;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }
  }, [code, width, height]);

  useEffect(() => {
    generateCode();
  }, [generateCode]);

  useEffect(() => {
    drawCaptcha();
  }, [code, drawCaptcha]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    if (val.length === 4) {
      const isValid = val.toLowerCase() === code.toLowerCase();
      onSuccess(isValid);
    } else {
      onSuccess(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={4}
          value={inputValue}
          onChange={handleChange}
          placeholder="请输入验证码"
          className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div 
          className="shrink-0 cursor-pointer overflow-hidden rounded-md border border-input bg-background group relative flex items-center justify-center h-11 w-[120px]"
          onClick={generateCode}
          title="点击刷新"
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full h-full object-cover block"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
            <RefreshCw className="w-5 h-5 text-white drop-shadow-md" />
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-1">
        <span className="text-xs text-muted-foreground">
          {timeLeft}秒后自动刷新
        </span>
        <span 
          className="text-xs text-primary hover:underline cursor-pointer" 
          onClick={generateCode}
        >
          看不清？换一张
        </span>
      </div>
    </div>
  );
}