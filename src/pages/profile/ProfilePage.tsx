import { useAuth } from '@/contexts/AuthContext';
import { useRechargeModal } from '@/contexts/RechargeModalContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Zap, ShoppingBag, Layers, Share2, Crown, ArrowRight, User, ScrollText, Wallet } from 'lucide-react';

export default function ProfilePage() {
  const { profile } = useAuth();
  const { openRechargeModal } = useRechargeModal();
  const { t, language } = useLanguage();

  const quickLinks = [
    { label: language === 'zh' ? '我的钱包' : (language === 'en' ? 'Wallet' : 'กระเป๋าสตางค์ของฉัน'), href: '/profile/wallet', icon: Wallet, desc: language === 'zh' ? `当前 ${profile?.credits ?? 0} 积分` : (language === 'en' ? `Current ${profile?.credits ?? 0} credits` : `เครดิตปัจจุบัน ${profile?.credits ?? 0}`) },
    { label: language === 'zh' ? '积分明细' : (language === 'en' ? 'Credit Details' : 'รายละเอียดเครดิต'), href: '/profile/credits', icon: ScrollText, desc: language === 'zh' ? '查看积分增减明细' : (language === 'en' ? 'View credit history' : 'ดูประวัติเครดิต') },
    { label: language === 'zh' ? '邀请中心' : (language === 'en' ? 'Invite Center' : 'ศูนย์เชิญชวน'), href: '/profile/invite', icon: User, desc: language === 'zh' ? '邀请好友赚积分' : (language === 'en' ? 'Invite friends to earn credits' : 'เชิญเพื่อนรับเครดิต') },
    { label: language === 'zh' ? '订单管理' : (language === 'en' ? 'Orders' : 'การจัดการคำสั่งซื้อ'), href: '/profile/orders', icon: ShoppingBag, desc: language === 'zh' ? '查看充值、购买记录' : (language === 'en' ? 'View purchase history' : 'ดูประวัติการซื้อ') },
    { label: language === 'zh' ? '作品管理' : (language === 'en' ? 'Works' : 'การจัดการผลงาน'), href: '/profile/works', icon: Layers, desc: language === 'zh' ? '管理你的所有作品' : (language === 'en' ? 'Manage all your works' : 'จัดการผลงานทั้งหมดของคุณ') },
    { label: language === 'zh' ? '推广后台' : (language === 'en' ? 'Promote' : 'ส่งเสริมการขาย'), href: '/profile/promote', icon: Share2, desc: language === 'zh' ? '代理推广收益中心' : (language === 'en' ? 'Agent promote dashboard' : 'ศูนย์รายได้จากการส่งเสริมการขาย') },
  ];

  return (
    <div className="space-y-6">
      {/* 用户信息卡 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-2xl gradient-primary-bg text-white">
                {profile?.username?.[0]?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold truncate">{profile?.username ?? (language === 'zh' ? '用户' : (language === 'en' ? 'User' : 'ผู้ใช้'))}</h2>
                {profile?.agent_level !== 'none' && (
                  <Badge className="gradient-primary-bg text-white border-0 gap-1">
                    <Crown className="w-3 h-3" />
                    {profile?.agent_level === 'agent1' ? t('agent_level1_name' as any) : t('agent_level2_name' as any)}
                  </Badge>
                )}
                {profile?.role === 'admin' && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    {language === 'zh' ? '管理员' : (language === 'en' ? 'Admin' : 'ผู้ดูแลระบบ')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'zh' ? '注册于' : (language === 'en' ? 'Registered on' : 'ลงทะเบียนเมื่อ')} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(language === 'en' ? 'en-US' : (language === 'th' ? 'th-TH' : 'zh-CN')) : '-'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.credits?.toLocaleString() ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> {language === 'zh' ? '剩余积分' : (language === 'en' ? 'Remaining Credits' : 'เครดิตที่เหลือ')}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <div className="text-2xl font-bold">
                {profile?.agent_level === 'none' ? (language === 'zh' ? '普通用户' : (language === 'en' ? 'Normal User' : 'ผู้ใช้ทั่วไป')) :
                  profile?.agent_level === 'agent2' ? t('agent_level2_name' as any) : t('agent_level1_name' as any)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <User className="w-3 h-3" /> {language === 'zh' ? '账户等级' : (language === 'en' ? 'Account Level' : 'ระดับบัญชี')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickLinks.map(item => (
          <Card key={item.href} className="border-border hover:border-primary/30 hover:shadow-card transition-all h-full">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground flex-1 text-pretty">{item.desc}</p>
              <Button variant="ghost" size="sm" className="mt-3 w-full justify-between px-2 text-primary hover:bg-primary/5" asChild>
                <Link to={item.href}>
                  {language === 'zh' ? '前往' : (language === 'en' ? 'Go to' : 'ไปที่')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 升级代理入口 */}
      {profile?.agent_level === 'none' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" /> {language === 'zh' ? '升级为代理' : (language === 'en' ? 'Upgrade to Agent' : 'อัปเกรดเป็นตัวแทน')}
              </h4>
              <p className="text-sm text-muted-foreground mt-1 text-pretty">{language === 'zh' ? '成为代理商，每次推广充值可获得高额返点' : (language === 'en' ? 'Become an agent and get high rebates for every referred recharge' : 'ร่วมเป็นตัวแทนและรับเงินคืนสูงสำหรับการเติมเงินที่อ้างอิงทุกครั้ง')}</p>
            </div>
            <Button className="gradient-primary-bg border-0 text-white hover:opacity-90 shrink-0" size="sm" asChild>
              <Link to="/agent">{language === 'zh' ? '了解详情' : (language === 'en' ? 'Learn more' : 'เรียนรู้เพิ่มเติม')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
