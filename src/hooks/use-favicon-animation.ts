import { useEffect, useRef } from 'react';

/**
 * 在浏览器标签页 favicon 上叠加旋转彩色光弧动画。
 * 页面加载完成（load 事件）后停止动画，恢复原始静态图标。
 */
export function useFaviconAnimation() {
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);

  useEffect(() => {
    // 已加载完毕则不启动动画
    if (document.readyState === 'complete') return;

    const SIZE = 64;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 原始 favicon link 元素
    let faviconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!faviconEl) {
      faviconEl = document.createElement('link');
      faviconEl.rel = 'icon';
      document.head.appendChild(faviconEl);
    }
    const originalHref = faviconEl.href;

    // 预加载原始图标
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/favicon.png';

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // 绘制原始图标（圆形裁剪）
      ctx.save();
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
      } else {
        // 图标未加载时显示渐变背景
        const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        grad.addColorStop(0, '#8b5cf6');
        grad.addColorStop(1, '#0ea5e9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
      ctx.restore();

      // 旋转光弧
      const cx = SIZE / 2;
      const cy = SIZE / 2;
      const r = SIZE / 2 - 2;
      const angle = angleRef.current;

      // 光弧1：紫色→青色
      const arc1 = (() => {
            const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
            g.addColorStop(0, 'rgba(167,139,250,0)');
            g.addColorStop(0.5, 'rgba(167,139,250,0.9)');
            g.addColorStop(1, 'rgba(34,211,238,0)');
            return g;
          })();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      ctx.arc(cx, cy, r, -0.4, Math.PI * 0.7);
      ctx.strokeStyle = arc1 || 'rgba(167,139,250,0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // 光弧2：反向，青色
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle * 0.7);
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      ctx.arc(cx, cy, r - 3, 0.2, Math.PI * 1.1);
      ctx.strokeStyle = 'rgba(34,211,238,0.65)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // 更新 favicon
      faviconEl!.href = canvas.toDataURL('image/png');
      angleRef.current += 0.08;
      animRef.current = requestAnimationFrame(draw);
    };

    // 图标加载完成后开始动画（确保绘制时图片已就绪）
    const start = () => { animRef.current = requestAnimationFrame(draw); };
    img.onload = start;
    if (img.complete) start();

    // 页面加载完成后停止动画，恢复静态图标
    const onLoad = () => {
      cancelAnimationFrame(animRef.current);
      // 恢复原始 favicon
      setTimeout(() => {
        if (faviconEl) faviconEl.href = originalHref;
      }, 300);
    };
    window.addEventListener('load', onLoad);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('load', onLoad);
      if (faviconEl) faviconEl.href = originalHref;
    };
  }, []);
}
