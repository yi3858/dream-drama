import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Settings, Save, RefreshCw, Info } from 'lucide-react';

interface SysConfig {
  key: string;
  value: string;
  description: string;
}

// 分组定义
const CONFIG_GROUPS: { title: string; keys: string[]; descriptions: Record<string, string> }[] = [
  {
    title: '客服与联系',
    keys: ['service_wechat_id', 'service_contact_qr', 'wechat_pay_qr', 'alipay_pay_qr'],
    descriptions: {
      service_wechat_id: '客服微信号（展示在充值弹窗，供用户手动添加客服）',
      service_contact_qr: '客服微信二维码图片URL（用户点击充值时弹窗展示，扫码添加客服后人工充值）',
      wechat_pay_qr: '微信收款二维码图片URL（扫码支付流程展示，留空显示占位图）',
      alipay_pay_qr: '支付宝收款二维码图片URL（扫码支付流程展示，留空显示占位图）',
    },
  },
  {
    title: '积分计费规则',
    keys: ['base_start_credits', 'credit_per_second_480p', 'credit_per_second_720p', 'credit_per_second_1080p'],
    descriptions: {
      base_start_credits: '每次生成的基础启动积分（固定消耗）',
      credit_per_second_480p: '480P 每秒积分倍率',
      credit_per_second_720p: '720P 每秒积分消耗（基准值 = 1）',
      credit_per_second_1080p: '1080P 每秒积分倍率',
    },
  },
  {
    title: '代理结算规则',
    keys: ['rebate_settle_days', 'min_withdrawal'],
    descriptions: {
      rebate_settle_days: '返点结算周期（T+N 天）',
      min_withdrawal: '最低提现金额（元）',
    },
  },
  {
    title: '生成限制与安全',
    keys: ['daily_gen_limit', 'ai_watermark_enabled', 'content_audit_enabled'],
    descriptions: {
      daily_gen_limit: '单用户每日最大生成任务次数（防刷）',
      ai_watermark_enabled: '是否强制添加"AI生成"水印（true/false）',
      content_audit_enabled: '是否开启内容安全审核（true/false）',
    },
  },
];

export default function AdminSystemConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data } = await supabase.from('system_configs').select('key, value, description');
    const map: Record<string, string> = {};
    (data ?? []).forEach((r: SysConfig) => { map[r.key] = r.value; });
    setConfigs(map);
    setOriginal(map);
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleChange = (key: string, value: string) => {
    setConfigs(prev => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setSaving(true);
    const changed = Object.entries(configs).filter(([k, v]) => v !== original[k]);
    if (changed.length === 0) { toast.info('没有需要保存的修改'); setSaving(false); return; }

    const upserts = changed.map(([key, value]) => ({
      key,
      value,
      description: ALL_DESCRIPTIONS[key] ?? key,
    }));

    const { error } = await supabase.from('system_configs').upsert(upserts, { onConflict: 'key' });
    setSaving(false);
    if (error) { toast.error('保存失败：' + error.message); return; }
    setOriginal({ ...configs });
    toast.success(`已保存 ${changed.length} 项配置`);
  };

  const isDirty = Object.entries(configs).some(([k, v]) => v !== original[k]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> 系统配置
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">修改后点击"保存所有"生效</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchConfigs} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> 刷新
          </Button>
          <Button
            size="sm"
            className="gap-1.5 gradient-primary-bg border-0 text-white hover:opacity-90"
            onClick={saveAll}
            disabled={saving || !isDirty}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? '保存中...' : `保存${isDirty ? '（有修改）' : ''}`}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">加载中...</CardContent></Card>
      ) : (
        CONFIG_GROUPS.map(group => (
          <Card key={group.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.keys.map(key => {
                const changed = configs[key] !== original[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-normal font-mono text-primary">{key}</Label>
                      {changed && <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 border">已修改</Badge>}
                    </div>
                    <Input
                      value={configs[key] ?? ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className="font-mono text-sm"
                    />
                    {group.descriptions[key] && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {group.descriptions[key]}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      {/* 所有其他配置 */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">其他配置项</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(configs)
            .filter(k => !CONFIG_GROUPS.flatMap(g => g.keys).includes(k))
            .map(key => {
              const changed = configs[key] !== original[key];
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-normal font-mono text-muted-foreground">{key}</Label>
                    {changed && <Badge className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 border">已修改</Badge>}
                  </div>
                  <Input value={configs[key] ?? ''} onChange={e => handleChange(key, e.target.value)} className="font-mono text-sm" />
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}

// 用于 upsert 时提供 description
const ALL_DESCRIPTIONS: Record<string, string> = {
  ...CONFIG_GROUPS.reduce((acc, g) => ({ ...acc, ...g.descriptions }), {} as Record<string, string>),
};
