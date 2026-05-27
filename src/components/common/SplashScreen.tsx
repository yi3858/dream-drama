import { useState, useEffect, useRef } from 'react';

// 粒子类型
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

const PARTICLE_COLORS = ['#a78bfa', '#818cf8', '#22d3ee', '#c084fc', '#60a5fa', '#f0abfc'];

function useParticles(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.2;
      particles.current.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        size: 1.5 + Math.random() * 3,
        opacity: 0.6 + Math.random() * 0.4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        life: 0,
        maxLife: 90 + Math.random() * 60,
      });
    };

    let frame = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame % 3 === 0) spawn();
      frame++;

      particles.current = particles.current.filter(p => p.life < p.maxLife);
      particles.current.forEach(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.005;
        const progress = p.life / p.maxLife;
        const alpha = p.opacity * (1 - progress);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  return canvasRef;
}

const SESSION_KEY = 'zmcj_splash_shown';

export default function SplashScreen() {
  // 每个 session 只显示一次
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SESSION_KEY));
  const [phase, setPhase] = useState<'enter' | 'stay' | 'exit'>('enter');
  const canvasRef = useParticles(visible);

  useEffect(() => {
    if (!visible) return;
    // 入场 → 停留 → 退场
    const t1 = setTimeout(() => setPhase('stay'), 600);
    const t2 = setTimeout(() => setPhase('exit'), 2200);
    const t3 = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0e1a 0%, #10082a 50%, #060d1f 100%)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        opacity: phase === 'exit' ? 0 : 1,
        transform: phase === 'exit' ? 'scale(1.04)' : 'scale(1)',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
    >
      {/* 粒子画布 */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* 背景光晕 */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: '30%', left: '30%',
          width: '30rem', height: '30rem',
          background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
          animation: 'splashPulse1 3s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '25%', right: '25%',
          width: '22rem', height: '22rem',
          background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
          animation: 'splashPulse2 3.5s ease-in-out infinite',
        }} />
      </div>

      {/* 中心内容 */}
      <div className="relative flex flex-col items-center gap-6 select-none">
        {/* 图标 + 光圈动画 */}
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          {/* 外层旋转光环 */}
          <div style={{
            position: 'absolute', inset: -10,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #a78bfa, #22d3ee, #c084fc, #60a5fa, #a78bfa)',
            animation: 'splashSpin 2s linear infinite',
            opacity: 0.85,
          }} />
          {/* 内层遮罩，让光圈只在边缘显示 */}
          <div style={{
            position: 'absolute', inset: 4,
            borderRadius: '50%',
            background: '#0a0e1a',
            zIndex: 1,
          }} />
          {/* 图标 */}
          <div style={{
            position: 'absolute', inset: 8,
            borderRadius: '50%',
            overflow: 'hidden',
            zIndex: 2,
            animation: phase === 'enter' ? 'splashIconEnter 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : undefined,
            boxShadow: '0 0 30px rgba(139,92,246,0.5)',
          }}>
            <img
              src="/favicon.png"
              alt="筑梦呈剧"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          </div>
          {/* 光斑扫过效果 */}
          <div style={{
            position: 'absolute', inset: 8, borderRadius: '50%', zIndex: 3,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* 品牌名 */}
        <div style={{
          textAlign: 'center',
          animation: 'splashTextEnter 0.6s ease forwards',
          animationDelay: '0.3s',
          opacity: 0,
        }}>
          <div style={{
            fontSize: '2.25rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            lineHeight: 1.1,
            background: 'linear-gradient(90deg, #c084fc, #22d3ee)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            筑梦呈剧
          </div>
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.9rem',
            color: '#94a3b8',
            letterSpacing: '0.15em',
            animation: 'splashTextEnter 0.6s ease forwards',
            animationDelay: '0.6s',
            opacity: 0,
          }}>
            AI 漫剧制作平台
          </div>
        </div>

        {/* 加载进度条 */}
        <div style={{
          width: 180, height: 2,
          background: 'rgba(148,163,184,0.15)',
          borderRadius: 2,
          overflow: 'hidden',
          animation: 'splashTextEnter 0.4s ease forwards',
          animationDelay: '0.8s',
          opacity: 0,
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #a78bfa, #22d3ee)',
            borderRadius: 2,
            animation: 'splashProgress 1.8s ease forwards',
            animationDelay: '0.5s',
          }} />
        </div>
      </div>

      {/* 关键帧 */}
      <style>{`
        @keyframes splashSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splashIconEnter {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes splashTextEnter {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes splashProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes splashPulse1 {
          0%, 100% { transform: scale(1);    opacity: 0.7; }
          50%      { transform: scale(1.15); opacity: 1;   }
        }
        @keyframes splashPulse2 {
          0%, 100% { transform: scale(1);    opacity: 0.6; }
          50%      { transform: scale(1.2);  opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
