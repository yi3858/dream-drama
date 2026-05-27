import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/db/supabase';
import type { ShowcaseWork } from '@/types';
import { Sparkles, TrendingUp, Search, Star, Eye } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

export default function ShowcasePage() {
  const { t, language } = useLanguage();
  const [works, setWorks] = useState<ShowcaseWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'novel_to_comic' | 'video_to_anime' | 'motion_transfer'>('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let q = supabase.from('showcase_works').select('*').eq('is_active', true).order('sort_order');
      if (filter !== 'all') q = q.eq('type', filter);
      const { data } = await q;
      let items = data ?? [];
      if (keyword) items = items.filter(w => w.title.includes(keyword) || (w.description ?? '').includes(keyword));
      setWorks(items);
      setLoading(false);
    };
    fetch();
  }, [filter, keyword]);

  // 增加浏览量
  const incrementView = (id: string) => {
    void supabase.rpc('increment_view' as never, { work_id: id });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {language === 'zh' ? '精选作品' : (language === 'en' ? 'Featured' : 'คัดสรร')}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">{t('showcase_title')}</h1>
        <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
          {t('showcase_subtitle')}
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Tabs value={filter} onValueChange={v => setFilter(v as typeof filter)} className="shrink-0">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="novel_to_comic">小说转漫剧</TabsTrigger>
            <TabsTrigger value="video_to_anime">短剧转动漫</TabsTrigger>
            <TabsTrigger value="motion_transfer">动作迁移</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索作品..."
            className="pl-10"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden h-full">
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : works.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">暂无作品</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {works.map((work) => (
            <Card
              key={work.id}
              className="group overflow-hidden border-border hover:border-primary/30 transition-all hover:shadow-hover h-full flex flex-col cursor-pointer"
              onClick={() => incrementView(work.id)}
            >
              <div className="aspect-video w-full overflow-hidden bg-muted relative shrink-0">
                {work.thumbnail_url && !work.thumbnail_url.startsWith('placeholder') ? (
                  <img
                    src={work.thumbnail_url}
                    alt={work.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-cyan-500/20">
                    <Sparkles className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2 text-[10px] bg-black/60 text-white border-0">
                  {work.type === 'novel_to_comic' ? '小说转漫剧' : work.type === 'motion_transfer' ? '动作迁移' : '短剧转动漫'}
                </Badge>
                {work.is_featured && (
                  <Badge className="absolute top-2 right-2 text-[10px] gradient-primary-bg text-white border-0">
                    <Star className="w-2.5 h-2.5 mr-0.5" /> 精选
                  </Badge>
                )}
              </div>
              <CardContent className="p-4 flex flex-col flex-1">
                <h4 className="font-semibold mb-1 text-balance">{work.title}</h4>
                {work.description && (
                  <p className="text-xs text-muted-foreground mb-3 text-pretty line-clamp-2 flex-1">{work.description}</p>
                )}
                <div className="mt-auto">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(work.tags || []).slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px] h-5">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <Eye className="w-3 h-3" />
                    {work.view_count.toLocaleString()} 次观看
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
