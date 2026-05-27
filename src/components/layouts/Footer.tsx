import { Link } from 'react-router-dom';
import { Sparkles, Mail, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LegalDisclaimerDialog } from '@/components/common/LegalDisclaimerDialog';

export default function Footer() {
  const { t, language } = useLanguage();

  const footerLinks = [
    {
      title: t('footer_product'),
      links: [
        { label: t('nav_novel'), href: '/novel-to-comic' },
        { label: t('nav_video'), href: '/video-to-anime' },
        { label: t('nav_top_showcase'), href: '/showcase' },
        { label: t('nav_top_analysis'), href: '/dashboard' },
      ],
    },
    {
      title: language === 'zh' ? '会员与代理' : (language === 'en' ? 'Pricing & Agent' : 'สมาชิกและตัวแทน'),
      links: [
        { label: t('nav_top_pricing'), href: '/pricing' },
        { label: t('nav_top_agent'), href: '/agent' },
        { label: language === 'zh' ? '个人中心' : (language === 'en' ? 'Profile' : 'โปรไฟล์'), href: '/profile' },
        { label: t('nav_top_trending'), href: '/trending' },
      ],
    },
    {
      title: language === 'zh' ? '支持与帮助' : (language === 'en' ? 'Support & Help' : 'ความช่วยเหลือ'),
      links: [
        { label: language === 'zh' ? '常见问题' : (language === 'en' ? 'FAQ' : 'คำถามที่พบบ่อย'), href: '/profile/support' },
        { label: t('footer_contact'), href: '/profile/support' },
        { label: t('user_agreement'), href: '/terms' },
        { label: t('privacy_policy'), href: '/privacy' },
      ],
    },
  ];

  const legalTrigger = (
    <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
      {language === 'zh' ? '法律与免责声明' : (language === 'en' ? 'Legal Disclaimer' : 'ข้อจำกัดความรับผิดชอบ')}
    </span>
  );

  return (
    <footer className="bg-[hsl(228_35%_4.5%)] border-t border-border/50 mt-auto">
      <div className="container mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* 品牌区 */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center">
              <span className="text-[28px] font-bold gradient-text tracking-tight leading-none">
                {language === 'zh' ? 'AI筑梦呈剧' : 'DreamComic AI'}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              {t('footer_desc')}
            </p>
            <div className="space-y-2">
              <a
                href="mailto:yi3858@163.com"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                {t('footer_email')}: yi3858@163.com
              </a>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="w-3.5 h-3.5" />
                {t('footer_wechat')}: yy889358
              </div>
            </div>
          </div>

          {/* 链接列 */}
          {footerLinks.map((col, colIdx) => (
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
                {/* 在"支持与帮助"列追加法律与免责声明入口 */}
                {colIdx === footerLinks.length - 1 && (
                  <li>
                    <LegalDisclaimerDialog trigger={legalTrigger} />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/80">
            {language === 'zh' ? '© 2026 筑梦呈剧 · 保留所有权利 | 由AI驱动 · 合规创作' : (language === 'en' ? '© 2026 DreamComic AI. All rights reserved. | AI-driven & Compliant' : '© 2026 DreamComic AI สงวนลิขสิทธิ์ | ขับเคลื่อนด้วย AI และถูกกฎหมาย')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <p className="text-xs text-muted-foreground/80">
              {language === 'zh' ? '⚠️ 本平台所有AI生成内容均携带AI标识 · 请遵守相关法律法规合规使用' : (language === 'en' ? '⚠️ All AI-generated content carries AI marks. Please use compliantly.' : '⚠️ เนื้อหาที่สร้างโดย AI ทั้งหมดมีเครื่องหมาย AI โปรดใช้ตามกฎระเบียบ')}
            </p>
            <LegalDisclaimerDialog
              trigger={
                <span className="text-xs text-primary/70 hover:text-primary transition-colors cursor-pointer underline-offset-2 hover:underline shrink-0">
                  {language === 'zh' ? '法律与免责声明' : (language === 'en' ? 'Legal Disclaimer' : 'ข้อจำกัด')}
                </span>
              }
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
