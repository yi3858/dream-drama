import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Headphones, MessageCircle, Mail, Phone, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const FAQS = [
  {
    q: '积分是如何扣除的？',
    a: '每次生成任务按公式扣除：基础启动分10分 + 视频时长（秒）× 分辨率倍率。480P倍率0.6，720P倍率1.0，1080P为1.8。',
  },
  {
    q: 'AI生成失败会退还积分吗？',
    a: '是的，因平台或API故障导致未能输出完整视频的，系统会自动全额退还本次任务扣除的所有积分。',
  },
  {
    q: '积分会过期吗？',
    a: '个人套餐积分永久有效，不会过期。企业团队套餐积分有90天有效期，请在有效期内使用。',
  },
  {
    q: '如何成为代理？',
    a: '访问"代理招商"页面，选择代理级别，缴纳代理费后即可成为代理商。完成后在"推广后台"获取专属链接开始推广。',
  },
  {
    q: '上传的小说文本有版权要求吗？',
    a: '是的，请确保上传的文本为您原创或已获版权授权。每次生成前需要勾选版权承诺声明。',
  },
  {
    q: '生成的作品有AI水印吗？',
    a: '是的，根据2026年AI内容监管规范，所有AI生成内容均强制添加"AI生成"标识，此功能无法关闭。',
  },
  {
    q: '支持哪些支付方式？',
    a: '目前支持微信支付和支付宝支付，充值金额实时到账。',
  },
  {
    q: '可以要求开发票吗？',
    a: '目前暂不支持开具发票，如有需要请联系客服处理。',
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      {/* 联系客服 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" /> 联系客服
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: MessageCircle, label: '微信客服', value: 'mhxq_service', action: '复制微信号', color: 'text-green-400' },
              { icon: Mail, label: '邮件支持', value: 'support@mhxq.com', action: '发送邮件', color: 'text-blue-400', href: 'mailto:support@mhxq.com' },
              { icon: Phone, label: '工作时间', value: '周一至周日 9:00-21:00', action: '', color: 'text-amber-400' },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{item.value}</p>
                {item.action && (
                  item.href ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                      <a href={item.href} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3" /> {item.action}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => { navigator.clipboard.writeText(item.value); }}
                    >
                      {item.action}
                    </Button>
                  )
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 快速入口 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '使用教程', desc: '视频教程和图文指南', badge: '新手必看' },
          { label: '更新日志', desc: '平台最新功能更新记录', badge: null },
        ].map(item => (
          <Card key={item.label} className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <Badge className="text-[10px] gradient-primary-bg text-white border-0">{item.badge}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">常见问题解答</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border-b border-border last:border-0"
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 py-4 text-left hover:text-primary transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-medium text-sm">{faq.q}</span>
                {openFaq === i
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="pb-4 text-sm text-muted-foreground leading-relaxed text-pretty">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
