import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Flame, Hash, BarChart2, Zap, ArrowUp } from 'lucide-react';

const hotTopics = [
  { rank: 1, title: '都市异能觉醒', heat: 98, trend: '+12%', type: '玄幻' },
  { rank: 2, title: '穿越古代女帝', heat: 94, trend: '+8%', type: '穿越' },
  { rank: 3, title: '豪门赘婿逆袭', heat: 91, trend: '+15%', type: '爽文' },
  { rank: 4, title: '末日求生进化', heat: 87, trend: '+6%', type: '末日' },
  { rank: 5, title: '都市医神', heat: 83, trend: '+22%', type: '都市' },
  { rank: 6, title: '星际修仙', heat: 79, trend: '+9%', type: '科幻' },
  { rank: 7, title: '校园青春恋爱', heat: 76, trend: '+4%', type: '青春' },
  { rank: 8, title: '重生商界女强人', heat: 74, trend: '+18%', type: '商战' },
  { rank: 9, title: '武道宗师', heat: 71, trend: '+7%', type: '武侠' },
  { rank: 10, title: '绝世萌宝追夫记', heat: 68, trend: '+11%', type: '甜宠' },
];

const trendTags = ['玄幻', '穿越', '甜宠', '爽文', '逆袭', '末日', '修仙', '都市', '武侠', '言情', '青春', '商战'];

const styleRanking = [
  { style: '二次元', pct: 42, color: 'bg-violet-500' },
  { style: '3D国漫', pct: 28, color: 'bg-orange-500' },
  { style: '写实风', pct: 16, color: 'bg-cyan-500' },
  { style: '古风插画', pct: 9, color: 'bg-amber-500' },
  { style: '其他', pct: 5, color: 'bg-muted' },
];

export default function TrendingPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/20">
          <Flame className="w-3.5 h-3.5 mr-1.5" /> 实时热点
        </Badge>
        <h1 className="text-3xl font-bold mb-2 text-balance">创作热点榜单</h1>
        <p className="text-muted-foreground text-pretty">
          基于全平台创作数据，实时更新的题材热度榜
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 热门题材 */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                题材热度榜 TOP 10
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hotTopics.map((topic) => (
                <div
                  key={topic.rank}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                    topic.rank <= 3 ? 'gradient-primary-bg text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {topic.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{topic.title}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{topic.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-primary-bg rounded-full"
                          style={{ width: `${topic.heat}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{topic.heat}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-xs text-emerald-400 shrink-0">
                    <ArrowUp className="w-3 h-3" />
                    {topic.trend}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 右侧数据 */}
        <div className="space-y-5">
          {/* 热门标签 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Hash className="w-5 h-5 text-primary" /> 热门标签
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {trendTags.map((tag, i) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-xs"
                    style={{ opacity: 1 - i * 0.04 }}
                  >
                    # {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 画风占比 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="w-5 h-5 text-primary" /> 画风分布
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {styleRanking.map((s) => (
                <div key={s.style} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.style}</span>
                    <span className="text-muted-foreground">{s.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 平台数据 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> 今日数据
              </h4>
              {[
                { label: '今日新作', value: '1,248' },
                { label: '今日生成次数', value: '8,630' },
                { label: '新增创作者', value: '312' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-bold gradient-text">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
