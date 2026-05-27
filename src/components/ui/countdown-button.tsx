import React, { useState, useEffect } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';

export interface CountdownButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * 点击处理函数。如果返回 true 或解析为 true，则开始倒计时。
   */
  onClick: () => boolean | Promise<boolean>;
  /**
   * 倒计时时长（秒），默认为 60
   */
  duration?: number;
  /**
   * 默认显示文本
   */
  defaultText?: string;
  /**
   * 倒计时期间的文本格式化函数
   */
  countdownText?: (seconds: number) => string;
}

export function CountdownButton({
  onClick,
  duration = 60,
  defaultText = '获取验证码',
  countdownText = (s) => `剩余${s}秒`,
  disabled,
  ...props
}: CountdownButtonProps) {
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => setCountdown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  const handleClick = async () => {
    if (countdown > 0 || disabled || loading) return;
    
    setLoading(true);
    try {
      const shouldStart = await onClick();
      if (shouldStart) {
        setCountdown(duration);
      }
    } catch (error) {
      console.error('CountdownButton onClick error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      disabled={disabled || countdown > 0 || loading}
      onClick={handleClick}
      {...props}
    >
      {countdown > 0 ? countdownText(countdown) : defaultText}
    </Button>
  );
}
