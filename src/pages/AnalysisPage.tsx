import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, TrendingUp, Star, Lightbulb, Crown, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const hotWorks = [
  { rank: 1, title: '都市玄幻·天元录', views: 128400, growth: '+45%', type: '小说转漫剧', tags: ['玄幻', '都市'] },
  { rank: 2, title: '校园青春·那年夏天', views: 98600, growth: '+38%', type: '短剧转动漫', tags: ['青春', '校园'] },
  { rank: 3, title: '甜蜜恋爱·雨后阳光', views: 87300, growth: '+29%', type: '短剧转动漫', tags: ['言情', '甜宠'] },
  { rank: 4, title: '古风侠义·江湖行', views: 72100, growth: '+22%', type: '小说转漫剧', tags: ['古风', '武侠'] },
  { rank: 5, title: '科幻冒险·星际迷途', views: 65800, growth: '+18%', type: '短剧转动漫', tags: ['科幻', '冒险'] },
];

const keyFactors = [
  { icon: Crown, title: '强烈情感冲突', desc: '爱恨情仇、逆袭复仇等强情绪线索是爆款核心', color: 'text-amber-400' },
  { icon: Zap, title: '快节奏叙事', desc: '前3秒必须有钩子，每集不超过3分钟最佳', color: 'text-cyan-400' },
  { icon: Star, title: '精美视觉呈现', desc: '高质量分镜和画风选择直接影响完播率', color: 'text-violet-400' },
  { icon: TrendingUp, title: '紧跟热点题材', desc: '结合当前热榜题材，借势流量事半功倍', color: 'text-pink-400' },
  { icon: Lightbulb, title: '标题党策略', desc: '悬念式、对比式标题点击率提升60%以上', color: 'text-emerald-400' },
  { icon: BarChart2, title: '持续更新节奏', desc: '日更或周更维持用户粘性，连载效果最佳', color: 'text-orange-400' },
];

const platformData = [
  { platform: '抖音', share: '38%', color: 'bg-pink-500' },
  { platform: '快手', share: '24%', color: 'bg-orange-500' },
  { platform: 'B站', share: '18%', color: 'bg-cyan-500' },
  { platform: '小红书', share: '12%', color: 'bg-rose-500' },
  { platform: '其他', share: '8%', color: 'bg-muted' },
];

export default function AnalysisPage() {
  const { t, language } = useLanguage();
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Badge className="mb-4 bg-violet-500/10 text-violet-400 border-violet-500/20">
          <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> {language === 'zh' ? '数据分析' : (language === 'en' ? 'Data Analysis' : 'วิเคราะห์ข้อมูล')}
        </Badge>
        <h1 className="text-3xl font-bold mb-2 text-balance">{t('analysis_title')}</h1>
        <p className="text-muted-foreground text-pretty">
          {t('analysis_desc')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* 爆款排行 */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-violet-400" /> 近30天爆款作品 TOP 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['排名', '作品名称', '类型', '播放量', '增长率', '标签'].map(h => (
                      <th key={h} className="text-left text-xs text-muted-foreground font-medium pb-3 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {hotWorks.map(w => (
                    <tr key={w.rank} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${w.rank <= 3 ? 'gradient-primary-bg text-white' : 'bg-muted text-muted-foreground'}`}>
                          {w.rank}
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-medium text-sm whitespace-nowrap">{w.title}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">{w.type}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm whitespace-nowrap">{w.views.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-emerald-400 text-sm font-medium whitespace-nowrap">{w.growth}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {w.tags.map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] h-4 px-1">{t}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 爆款要素 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-amber-400" /> 爆款六大要素
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {keyFactors.map((f) => (
              <div key={f.title} className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <f.icon className={`w-4 h-4 shrink-0 mt-0.5 ${f.color}`} />
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{f.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 平台分布 */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="w-5 h-5 text-primary" /> 爆款发布平台分布
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {platformData.map(p => (
                <div key={p.platform} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{p.platform}</span>
                    <span className="text-muted-foreground">{p.share}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full`} style={{ width: p.share }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 创作建议 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> 本周创作建议
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><span className="text-primary shrink-0">•</span>逆袭+甜宠题材正处上升期，抓紧布局</li>
                <li className="flex gap-2"><span className="text-primary shrink-0">•</span>单集时长3分钟以内完播率最高</li>
                <li className="flex gap-2"><span className="text-primary shrink-0">•</span>优先选择二次元或3D国漫风格</li>
                <li className="flex gap-2"><span className="text-primary shrink-0">•</span>抖音首发+小红书种草效果最佳</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
