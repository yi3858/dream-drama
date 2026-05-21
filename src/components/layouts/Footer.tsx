import { Link } from 'react-router-dom';
import { Sparkles, Mail, MessageCircle } from 'lucide-react';

const footerLinks = [
  {
    title: '产品功能',
    links: [
      { label: '小说转漫剧', href: '/novel-to-comic' },
      { label: '短剧转动漫', href: '/video-to-anime' },
      { label: '作品案例', href: '/showcase' },
      { label: '数据看板', href: '/dashboard' },
    ],
  },
  {
    title: '会员与代理',
    links: [
      { label: '积分充值', href: '/pricing' },
      { label: '代理招商', href: '/agent' },
      { label: '个人中心', href: '/profile' },
      { label: '创作热点', href: '/trending' },
    ],
  },
  {
    title: '支持与帮助',
    links: [
      { label: '常见问题', href: '/profile/support' },
      { label: '联系客服', href: '/profile/support' },
      { label: '用户协议', href: '/terms' },
      { label: '隐私政策', href: '/privacy' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[hsl(228_35%_4.5%)] border-t border-border/50 mt-auto">
      <div className="container mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* 品牌区 */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-primary-bg flex items-center justify-center glow-primary">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #7c3aed 60%, #06b6d4 100%)',
                  boxShadow: '0 0 10px hsl(var(--primary)/0.5)',
                }}>
                <div className="absolute inset-0 opacity-30"
                  style={{ background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.6) 0%, transparent 60%)' }} />
                <span className="relative z-10 text-white font-black text-[11px] tracking-tighter leading-none">AI</span>
                <div className="absolute bottom-1 right-1 w-0.5 h-0.5 rounded-full bg-white/70" />
              </div>
                <span className="text-lg font-bold gradient-text">筑梦呈剧</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              专业AI漫剧制作平台，用科技赋能创作，让每个故事都能绽放光彩。
            </p>
            <div className="space-y-2">
              <a
                href="mailto:support@mhxq.com"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                support@mhxq.com
              </a>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="w-3.5 h-3.5" />
                微信客服：mhxq_service
              </div>
            </div>
          </div>

          {/* 链接列 */}
          {footerLinks.map((col) => (
            <div key={col.title} className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground/90 tracking-wide">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/80">
            © 2026 筑梦呈剧 · 保留所有权利 | 由AI驱动 · 合规创作
          </p>
          <p className="text-xs text-muted-foreground/80">
            ⚠️ 本平台所有AI生成内容均携带AI标识 · 请遵守相关法律法规合规使用
          </p>
        </div>
      </div>
    </footer>
  );
}
