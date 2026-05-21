import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen, Film, Sparkles, ArrowRight, Play, Zap, Shield, Users,
  Star, TrendingUp, Clock, ChevronRight, CheckCircle2, Crown, Megaphone,
  ImageIcon, Video,
} from 'lucide-react';

// 左侧竖向功能导航数据
const sideNavItems = [
  { label: '小说转漫剧', href: '/novel-to-comic', icon: BookOpen },
  { label: '短剧转动漫', href: '/video-to-anime', icon: Film },
  { label: '广告制作',   href: '/ad-maker',        icon: Megaphone },
  { label: '文生图',     href: '/text-to-image',   icon: ImageIcon },
  { label: '图生视频',   href: '/image-to-video',  icon: Video },
];
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { ShowcaseWork } from '@/types';

const features = [
  {
    icon: BookOpen,
    title: '小说转漫剧',
    desc: '输入小说文本，AI自动分镜拆解、绘制分镜画面、合成动态漫剧视频',
    href: '/novel-to-comic',
    color: 'from-violet-500 to-purple-600',
    tags: ['自动分镜', 'AI绘图', '视频合成'],
  },
  {
    icon: Film,
    title: '短剧转动漫',
    desc: '上传实拍短剧素材，一键转换为精美动漫风格，自动剪辑+字幕生成',
    href: '/video-to-anime',
    color: 'from-cyan-500 to-blue-600',
    tags: ['风格转换', '智能剪辑', '自动字幕'],
  },
  {
    icon: Megaphone,
    title: '广告制作',
    desc: '选择广告类型与风格，AI一键生成专业广告视频，适用于抖音、视频号、小红书、门店宣传',
    href: '/ad-maker',
    color: 'from-orange-500 to-rose-500',
    tags: ['5种类型', '6种风格', '真人模式'],
    badge: 'NEW',
  },
  {
    icon: ImageIcon,
    title: '文生图',
    desc: '输入文字描述，AI秒级生成精美图片，支持8种艺术风格、多种比例和精细度',
    href: '/text-to-image',
    color: 'from-emerald-500 to-teal-600',
    tags: ['8种风格', '5种比例', 'AI绘图'],
    badge: 'NEW',
  },
  {
    icon: Video,
    title: '图生视频',
    desc: '上传一张图片，AI让静态画面动起来，支持运动强度、时长、风格自定义',
    href: '/image-to-video',
    color: 'from-pink-500 to-fuchsia-600',
    tags: ['3种风格', '灵活时长', '动态生成'],
    badge: 'NEW',
  },
];

const stats = [
  { label: '注册创作者', value: '12,000+', icon: Users },
  { label: '生成作品数', value: '86,000+', icon: Sparkles },
  { label: '平均生成时长', value: '3分钟', icon: Clock },
  { label: '用户好评率', value: '98.6%', icon: Star },
];

const steps = [
  { step: '01', title: '输入创作素材', desc: '上传小说文本或短剧视频，选择创作风格' },
  { step: '02', title: 'AI智能处理', desc: '系统自动分镜、绘图、转换，无需等待' },
  { step: '03', title: '确认与调整', desc: '预览分镜效果，可手动微调场景内容' },
  { step: '04', title: '下载成品', desc: '高清漫剧视频一键下载，随时分享' },
];

const styles = [
  { name: '二次元', color: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
  { name: '写实风', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
  { name: '3D国漫', color: 'bg-orange-500/15 text-orange-300 border-orange-500/25' },
  { name: '水墨风', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  { name: '欧美漫画', color: 'bg-pink-500/15 text-pink-300 border-pink-500/25' },
  { name: '古风插画', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  { name: '赛博朋克', color: 'bg-sky-500/15 text-sky-300 border-sky-500/25' },
  { name: '新海诚风', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' },
  { name: 'Q版萌系', color: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25' },
];

export default function HomePage() {
  const [showcases, setShowcases] = useState<ShowcaseWork[]>([]);
  const [showcasesLoading, setShowcasesLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase
      .from('showcase_works')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order')
      .limit(6)
      .then(({ data }) => {
        if (data) setShowcases(data);
        setShowcasesLoading(false);
      });
  }, []);

  return (
    <div className="w-full">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[88vh] md:min-h-[92vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute inset-0 grid-bg opacity-20 md:opacity-25" />
        {/* 径向光晕 */}
        <div className="absolute inset-0 radial-glow opacity-50 md:opacity-60" />
        {/* 装饰光球 — 移动端缩小避免视觉污染 */}
        <div className="absolute top-1/4 left-0 w-[220px] h-[220px] md:w-[480px] md:h-[480px] bg-primary/18 md:bg-primary/15 rounded-full blur-[64px] md:blur-[96px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-[180px] h-[180px] md:w-[360px] md:h-[360px] bg-cyan-500/12 md:bg-cyan-500/10 rounded-full blur-[56px] md:blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] md:w-[700px] md:h-[300px] bg-primary/10 md:bg-primary/8 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

        <div className="relative container mx-auto px-5 md:px-4 pt-8 pb-10 md:py-0 flex flex-col md:flex-row md:items-start md:gap-8">

          {/* ── 左侧竖向功能导航 ── */}
          <div className="hidden md:flex flex-col gap-1 pt-8 shrink-0 w-[148px]">
            {/* 5个功能入口 */}
            {sideNavItems.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                    active
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/6'
                  }`}
                >
                  <item.icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── 右侧 Hero 主内容 ── */}
          <div className="flex-1 min-w-0 text-center md:pt-8">
          {/* 顶部标签 — 居中 */}
          <Badge className="mb-6 md:mb-8 px-3 py-1.5 md:px-4 md:py-2 bg-primary/15 text-primary border-primary/25 text-xs md:text-sm font-medium rounded-full">
            <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5" />
            AI漫剧制作新纪元 · 2026
          </Badge>

          <h1 className="text-[2.4rem] leading-[1.15] md:text-6xl lg:text-7xl font-bold mb-5 md:mb-6 text-balance tracking-tight">
            <span className="text-foreground">让每个故事</span>
            <br />
            <span className="gradient-text">都能成为漫剧</span>
          </h1>

          {/* 描述文字 — 移动端单行紧凑 */}
          <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
            <span className="hidden md:inline">专业AI驱动的漫剧制作平台 · 小说文本一键生成漫剧视频</span>
            <span className="hidden md:inline"><br />短剧实拍智能转动漫 · 3分钟出片 · 合规创作</span>
            <span className="md:hidden">专业AI驱动 · 小说转漫剧 · 短剧转动漫<br />3分钟出片 · 合规创作</span>
          </p>

          {/* 按钮组 — 移动端竖排全宽 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-10 md:mb-14 px-2 sm:px-0">
            <Button
              size="lg"
              className="gradient-primary-bg border-0 text-white hover:opacity-90 glow-primary h-12 px-8 text-base gap-2 rounded-full w-full sm:w-auto"
              asChild
            >
              <Link to="/novel-to-comic">
                <Sparkles className="w-5 h-5" />
                立即创作
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/15 text-foreground hover:bg-white/8 h-12 px-8 text-base gap-2 rounded-full backdrop-blur-sm w-full sm:w-auto"
              asChild
            >
              <Link to="/showcase">
                <Play className="w-4 h-4" />
                查看作品案例
              </Link>
            </Button>
          </div>

          {/* 风格标签 — 移动端横向滚动，桌面自动换行 */}
          <div className="relative">
            <div className="flex md:flex-wrap md:justify-center items-center gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 no-scrollbar">
              <span className="text-sm text-muted-foreground shrink-0">支持风格：</span>
              {styles.map((s) => (
                <Badge key={s.name} variant="outline" className={`text-xs border rounded-full shrink-0 ${s.color}`}>
                  {s.name}
                </Badge>
              ))}
            </div>
            {/* 移动端右侧渐隐遮罩提示可滚动 */}
            <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[hsl(228_35%_5.5%)] to-transparent pointer-events-none md:hidden" />
          </div>
          </div>{/* end 右侧主内容 */}
        </div>
      </section>

      {/* ── 统计数据 ── */}
      <section className="py-12 bg-[hsl(228_32%_7.5%)] border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center ring-1 ring-primary/20">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 核心功能 ── */}
      <section className="py-24 container mx-auto px-4">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/12 text-primary border-primary/20 rounded-full px-4">核心能力</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-balance mb-4 tracking-tight">两大创作引擎</h2>
          <p className="text-muted-foreground text-lg text-pretty max-w-xl mx-auto">
            无论是文字世界还是影像素材，AI都能将其转化为精彩漫剧
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="group relative overflow-hidden border-border/60 hover:border-primary/35 bg-card transition-all duration-300 hover:shadow-hover h-full">
              <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity`} />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,hsl(var(--primary)/0.06),transparent)]" />
              <CardContent className="p-8 flex flex-col h-full relative">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_4px_20px_hsl(var(--primary)/0.25)]`}>
                    <f.icon className="w-7 h-7 text-white" />
                  </div>
                  {'badge' in f && f.badge && (
                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px] font-bold rounded-full px-2">
                      {f.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-balance">{f.title}</h3>
                <p className="text-muted-foreground mb-6 flex-1 text-pretty leading-relaxed">{f.desc}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {f.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs rounded-full bg-secondary/80">{tag}</Badge>
                  ))}
                </div>
                <Button
                  className={`w-full bg-gradient-to-r ${f.color} border-0 text-white hover:opacity-90 gap-2 rounded-full h-11`}
                  asChild
                >
                  <Link to={f.href}>
                    开始创作 <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 制作流程 ── */}
      <section className="py-24 bg-[hsl(228_32%_7.5%)] border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 rounded-full px-4">简单流程</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-balance mb-4 tracking-tight">4步完成你的漫剧</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-colors hover:shadow-card">
                {i < steps.length - 1 && (
                  <ChevronRight className="absolute -right-3 top-10 w-6 h-6 text-muted-foreground/50 hidden lg:block" />
                )}
                <div className="w-16 h-16 rounded-2xl gradient-primary-bg flex items-center justify-center text-white text-2xl font-bold mb-5 shadow-[0_4px_20px_hsl(var(--primary)/0.3)]">
                  {s.step}
                </div>
                <h4 className="font-semibold text-lg mb-2 text-balance">{s.title}</h4>
                <p className="text-sm text-muted-foreground text-pretty">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 作品案例 ── */}
      <section className="py-20 container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">精选作品</Badge>
            <h2 className="text-3xl font-bold text-balance">创作者作品展示</h2>
          </div>
          <Button variant="ghost" className="gap-1 text-primary hidden md:flex" asChild>
            <Link to="/showcase">
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {showcasesLoading ? (
          /* ── 骨架屏：精美扫光卡片 ── */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden h-full flex flex-col">
                {/* 缩略图占位 */}
                <div className="relative aspect-video w-full overflow-hidden">
                  <Skeleton className="w-full h-full rounded-none skeleton-base" />
                  {/* 左上角徽章 */}
                  <Skeleton className="absolute top-2 left-2 h-5 w-16 rounded-full skeleton-base" />
                </div>
                {/* 内容占位 */}
                <CardContent className="p-4 flex flex-col flex-1 space-y-3">
                  <Skeleton className="h-4 w-3/4 rounded-full skeleton-base" />
                  <Skeleton className="h-3 w-full rounded-full skeleton-base" />
                  <Skeleton className="h-3 w-5/6 rounded-full skeleton-base" />
                  {/* 标签行 */}
                  <div className="flex gap-1.5 pt-1 mt-auto">
                    <Skeleton className="h-5 w-12 rounded-full skeleton-base" />
                    <Skeleton className="h-5 w-14 rounded-full skeleton-base" />
                    <Skeleton className="h-5 w-10 rounded-full skeleton-base" />
                  </div>
                  {/* 观看数 */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Skeleton className="h-3 w-3 rounded-full skeleton-base" />
                    <Skeleton className="h-3 w-20 rounded-full skeleton-base" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : showcases.length > 0 ? (
          /* ── 真实数据：stagger 淡入 ── */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {showcases.map((work, i) => (
              <div
                key={work.id}
                className="animate-fade-in-up h-full"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Card className="group overflow-hidden border-border hover:border-primary/30 transition-all hover:shadow-hover h-full flex flex-col">
                  <div className="aspect-video w-full overflow-hidden bg-muted relative">
                    {work.thumbnail_url && !work.thumbnail_url.startsWith('placeholder') ? (
                      <img
                        src={work.thumbnail_url}
                        alt={work.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-cyan-500/20">
                        <Sparkles className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 text-[10px] bg-black/60 text-white border-0">
                      {work.type === 'novel_to_comic' ? '小说转漫剧' : '短剧转动漫'}
                    </Badge>
                    {work.is_featured && (
                      <Badge className="absolute top-2 right-2 text-[10px] gradient-primary-bg text-white border-0">
                        <Star className="w-2.5 h-2.5 mr-0.5" /> 精选
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h4 className="font-semibold mb-1.5 text-balance">{work.title}</h4>
                    {work.description && (
                      <p className="text-xs text-muted-foreground mb-3 text-pretty line-clamp-2">{work.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-3 mt-auto">
                      {(work.tags || []).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] h-5">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {work.view_count.toLocaleString()} 次观看
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          /* ── 空态 ── */
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无精选作品</p>
          </div>
        )}
        <div className="text-center mt-8 md:hidden">
          <Button variant="outline" asChild>
            <Link to="/showcase">查看全部作品</Link>
          </Button>
        </div>
      </section>

      {/* ── 平台优势 ── */}
      <section className="py-24 bg-[hsl(228_32%_7.5%)] border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 rounded-full px-4">平台优势</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-balance tracking-tight">为什么选择筑梦呈剧</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: '极速出片', desc: '平均3分钟生成完整漫剧视频，告别漫长等待', color: 'text-yellow-400', ring: 'ring-yellow-500/20', bg: 'bg-yellow-500/8' },
              { icon: Shield, title: '合规保障', desc: '强制AI标识+内容安全审核，满足2026年监管要求', color: 'text-green-400', ring: 'ring-green-500/20', bg: 'bg-green-500/8' },
              { icon: Star, title: '多元风格', desc: '二次元、写实、3D国漫等9种风格自由选择', color: 'text-violet-400', ring: 'ring-violet-500/20', bg: 'bg-violet-500/8' },
              { icon: Crown, title: '积分灵活', desc: '按量计费，积分永久有效，用多少扣多少', color: 'text-amber-400', ring: 'ring-amber-500/20', bg: 'bg-amber-500/8' },
              { icon: Users, title: '代理生态', desc: '完善的两级代理体系，推广变现轻松高效', color: 'text-cyan-400', ring: 'ring-cyan-500/20', bg: 'bg-cyan-500/8' },
              { icon: CheckCircle2, title: '角色一致', desc: '角色库锁定外貌特征，保持整集人物形象统一', color: 'text-pink-400', ring: 'ring-pink-500/20', bg: 'bg-pink-500/8' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 rounded-2xl border border-border/60 hover:border-primary/25 bg-card hover:shadow-card transition-all group">
                <div className={`w-11 h-11 rounded-xl ${item.bg} ring-1 ${item.ring} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1.5">{item.title}</h4>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute inset-0 grid-bg opacity-15" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/18 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-balance tracking-tight">
            开始你的<span className="gradient-text">AI漫剧创作</span>之旅
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto text-pretty">
            现在注册即可获得免费体验额度，无需信用卡，立即开始创作你的第一部漫剧
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="gradient-primary-bg border-0 text-white hover:opacity-90 glow-primary h-12 px-10 text-base gap-2 rounded-full"
              asChild
            >
              <Link to="/register">
                <Sparkles className="w-5 h-5" />
                免费开始创作
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/15 text-foreground hover:bg-white/8 h-12 px-8 text-base rounded-full"
              asChild
            >
              <Link to="/pricing">查看积分套餐</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
