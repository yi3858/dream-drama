import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { ModelChannel, ModelPricing, ProviderType, FeatureType } from '@/types';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Zap,
  DollarSign, PlugZap, TrendingUp, Info,
} from 'lucide-react';

// ─── 常量 ────────────────────────────────────────────────────────
const PROVIDERS: { value: ProviderType; label: string; color: string }[] = [
  { value: 'jimeng',      label: '即梦AI',       color: 'bg-pink-500/15 text-pink-500 border-pink-500/30' },
  { value: 'volc',        label: '火山引擎豆包',  color: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  { value: 'aliyun',      label: '阿里云通义万相', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  { value: 'runninghub',  label: 'RunningHub',  color: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
  { value: 'openai',      label: 'OpenAI兼容',  color: 'bg-green-500/15 text-green-500 border-green-500/30' },
];

const FEATURES: { value: FeatureType; label: string }[] = [
  { value: 'text_to_image',  label: '文本生图' },
  { value: 'image_to_video', label: '图生视频' },
  { value: 'text_to_video',  label: '文本生视频' },
];

const PROVIDER_DOCS: Record<ProviderType, string> = {
  jimeng:     '填入火山引擎 AccessKeyId（api_key）和 SecretAccessKey（api_secret）',
  volc:       '填入火山引擎 AccessKeyId（api_key）和 SecretAccessKey（api_secret）',
  aliyun:     '填入阿里云 DashScope API Key（api_key），无需填 api_secret',
  runninghub: '填入 RunningHub API Key（api_key），无需填 api_secret',
  openai:     '填入 OpenAI 或兼容格式 API Key（api_key），可自定义 Endpoint',
};

function providerBadge(type: ProviderType) {
  const p = PROVIDERS.find(p => p.value === type);
  return p ? (
    <Badge variant="outline" className={`text-xs ${p.color}`}>{p.label}</Badge>
  ) : <Badge variant="outline">{type}</Badge>;
}

// ─── 渠道列表 Tab ─────────────────────────────────────────────────
function ChannelsTab() {
  const [channels, setChannels]     = useState<ModelChannel[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showKey, setShowKey]       = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [editForm, setEditForm]     = useState<Partial<ModelChannel>>({});
  const [isNew, setIsNew]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('model_channels')
      .select('*')
      .order('sort_order', { ascending: true });
    setChannels(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setIsNew(true);
    setEditForm({
      name: '', provider_type: 'runninghub', model_id: '', api_key: '', api_secret: '',
      endpoint: '', feature_type: 'text_to_image', cost_per_call: 0, enabled: true,
      sort_order: 0, remark: '',
    });
    setEditOpen(true);
  };

  const openEdit = (ch: ModelChannel) => {
    setIsNew(false);
    setEditForm({ ...ch });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.name?.trim()) { toast.error('请填写渠道名称'); return; }
    if (!editForm.api_key?.trim()) { toast.error('请填写 API Key'); return; }
    setSaving(true);
    try {
      const payload = {
        name:          editForm.name!.trim(),
        provider_type: editForm.provider_type!,
        model_id:      editForm.model_id ?? '',
        api_key:       editForm.api_key!.trim(),
        api_secret:    editForm.api_secret ?? '',
        endpoint:      editForm.endpoint ?? '',
        feature_type:  editForm.feature_type!,
        cost_per_call: Number(editForm.cost_per_call ?? 0),
        enabled:       editForm.enabled ?? true,
        sort_order:    Number(editForm.sort_order ?? 0),
        remark:        editForm.remark ?? '',
        updated_at:    new Date().toISOString(),
      };
      if (isNew) {
        const { data, error } = await supabase.from('model_channels').insert(payload).select('id').single();
        if (error) throw error;
        // 自动创建默认定价
        if (data?.id) {
          await supabase.from('model_pricing').insert({
            channel_id: data.id,
            base_credits: editForm.feature_type === 'image_to_video' ? 50 : 10,
            multiplier: 1.0,
            user_credits: editForm.feature_type === 'image_to_video' ? 50 : 10,
          });
        }
        toast.success('渠道已创建');
      } else {
        const { error } = await supabase.from('model_channels').update(payload).eq('id', editForm.id!);
        if (error) throw error;
        toast.success('渠道已更新');
      }
      setEditOpen(false);
      await load();
    } catch (e) {
      toast.error(`保存失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSaving(false); }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await supabase.from('model_channels').update({ enabled, updated_at: new Date().toISOString() }).eq('id', id);
    setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled } : c));
    toast.success(enabled ? '渠道已启用' : '渠道已禁用');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('model_channels').delete().eq('id', deleteId);
    if (error) { toast.error('删除失败'); return; }
    toast.success('渠道已删除');
    setDeleteId(null);
    await load();
  };

  const featureGroups = FEATURES.map(f => ({
    ...f,
    channels: channels.filter(c => c.feature_type === f.value),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">渠道列表</h2>
          <p className="text-sm text-muted-foreground">管理各AI平台接入渠道，API Key 仅在后台传输，不对用户暴露</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />刷新
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1.5" />添加渠道
          </Button>
        </div>
      </div>

      {featureGroups.map(group => (
        <Card key={group.value} className="overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/30">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {group.label}
              <Badge variant="secondary">{group.channels.length} 个渠道</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">渠道名称</TableHead>
                    <TableHead className="whitespace-nowrap">平台</TableHead>
                    <TableHead className="whitespace-nowrap">模型ID</TableHead>
                    <TableHead className="whitespace-nowrap">API Key</TableHead>
                    <TableHead className="whitespace-nowrap">单次成本</TableHead>
                    <TableHead className="whitespace-nowrap">状态</TableHead>
                    <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.channels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">
                        暂无渠道，点击"添加渠道"新建
                      </TableCell>
                    </TableRow>
                  ) : group.channels.map(ch => (
                    <TableRow key={ch.id}>
                      <TableCell className="whitespace-nowrap font-medium">{ch.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{providerBadge(ch.provider_type)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{ch.model_id || '—'}</code>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {showKey[ch.id] ? ch.api_key : maskKey(ch.api_key)}
                          </code>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowKey(prev => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                          >
                            {showKey[ch.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-amber-500 font-medium">¥{Number(ch.cost_per_call).toFixed(4)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Switch
                          checked={ch.enabled}
                          onCheckedChange={v => toggleEnabled(ch.id, v)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ch)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(ch.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 编辑/新建 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? '添加渠道' : '编辑渠道'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm font-normal">渠道名称 *</Label>
                <Input value={editForm.name ?? ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="如：火山引擎豆包-文生图" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">AI平台</Label>
                <Select value={editForm.provider_type} onValueChange={v => setEditForm(p => ({ ...p, provider_type: v as ProviderType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">功能类型</Label>
                <Select value={editForm.feature_type} onValueChange={v => setEditForm(p => ({ ...p, feature_type: v as FeatureType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEATURES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 鉴权说明 */}
            {editForm.provider_type && (
              <div className="flex gap-2 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{PROVIDER_DOCS[editForm.provider_type]}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-normal">模型ID / Workflow ID</Label>
              <Input value={editForm.model_id ?? ''} onChange={e => setEditForm(p => ({ ...p, model_id: e.target.value }))}
                placeholder="如: wanx2.1-t2i-turbo / high_aes_general_v21" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">API Key *</Label>
              <Input value={editForm.api_key ?? ''} onChange={e => setEditForm(p => ({ ...p, api_key: e.target.value }))}
                placeholder="填入对应平台的API Key" type="password" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">API Secret（部分平台需要）</Label>
              <Input value={editForm.api_secret ?? ''} onChange={e => setEditForm(p => ({ ...p, api_secret: e.target.value }))}
                placeholder="AccessKey Secret / 留空表示不需要" type="password" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">接口地址（Endpoint，留空用默认值）</Label>
              <Input value={editForm.endpoint ?? ''} onChange={e => setEditForm(p => ({ ...p, endpoint: e.target.value }))}
                placeholder="https://visual.volcengineapi.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">单次成本价（元）</Label>
                <Input type="number" step="0.0001" min="0"
                  value={editForm.cost_per_call ?? 0}
                  onChange={e => setEditForm(p => ({ ...p, cost_per_call: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.0500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">排序权重</Label>
                <Input type="number" min="0" value={editForm.sort_order ?? 0}
                  onChange={e => setEditForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal">备注</Label>
              <Textarea rows={2} value={editForm.remark ?? ''}
                onChange={e => setEditForm(p => ({ ...p, remark: e.target.value }))}
                placeholder="如：主用渠道，高峰期可能排队" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.enabled ?? true}
                onCheckedChange={v => setEditForm(p => ({ ...p, enabled: v }))} />
              <Label className="text-sm font-normal">启用此渠道</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">删除后该渠道配置及定价将一并移除，且不可恢复。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 定价设置 Tab ─────────────────────────────────────────────────
function PricingTab() {
  interface ChannelWithPricing extends Omit<ModelChannel, 'pricing'> { pricing: ModelPricing | null }
  const [rows, setRows]       = useState<ChannelWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Partial<ModelPricing>>>({});
  const [saving, setSaving]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('model_channels')
      .select('*, pricing:model_pricing(*)')
      .order('sort_order');
    const flattened = (data ?? []).map(c => ({
      ...c,
      pricing: Array.isArray(c.pricing) ? (c.pricing[0] ?? null) : c.pricing,
    }));
    setRows(flattened as ChannelWithPricing[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (chId: string, field: string, val: string | boolean) => {
    setEditing(prev => ({
      ...prev,
      [chId]: { ...prev[chId], [field]: val },
    }));
  };

  const calcUserCredits = (base: number, multiplier: number) => Math.ceil(base * multiplier);

  const handleSave = async (ch: ChannelWithPricing) => {
    const draft = editing[ch.id] ?? {};
    const pricing = ch.pricing;
    const isAuto = draft.is_auto_calc ?? pricing?.is_auto_calc ?? true;
    const base = Number(draft.base_credits ?? pricing?.base_credits ?? 10);
    const mult = Number(draft.multiplier ?? pricing?.multiplier ?? 1.0);
    const manual = Number(draft.user_credits ?? pricing?.user_credits ?? 10);
    const finalCredits = isAuto ? calcUserCredits(base, mult) : manual;

    setSaving(ch.id);
    try {
      const payload = {
        base_credits: base,
        multiplier: mult,
        user_credits: finalCredits,
        is_auto_calc: isAuto,
        updated_at: new Date().toISOString(),
      };
      if (pricing?.id) {
        await supabase.from('model_pricing').update(payload).eq('id', pricing.id);
      } else {
        await supabase.from('model_pricing').insert({ ...payload, channel_id: ch.id });
      }
      setEditing(prev => { const n = { ...prev }; delete n[ch.id]; return n; });
      toast.success(`${ch.name} 定价已保存`);
      await load();
    } catch (e) {
      toast.error(`保存失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSaving(null); }
  };

  const profitRatio = (costPerCall: number, userCredits: number): string => {
    if (!costPerCall || costPerCall === 0) return '—';
    const revenueYuan = userCredits / 10;
    const profit = ((revenueYuan - costPerCall) / revenueYuan) * 100;
    return `${profit.toFixed(0)}%`;
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">加载中…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">定价设置</h2>
        <p className="text-sm text-muted-foreground">
          设置每个渠道用户消耗的积分数量。公式：用户积分 = 基础积分 × 模型倍率（可切换为手动填写）
        </p>
      </div>

      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="pt-3 pb-3">
          <div className="flex gap-2 text-xs text-amber-600">
            <DollarSign className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>汇率换算：10 积分 = ¥1，利润 = (用户积分/10 - 单次成本) / (用户积分/10) × 100%</span>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">渠道</TableHead>
              <TableHead className="whitespace-nowrap">单次成本</TableHead>
              <TableHead className="whitespace-nowrap">基础积分</TableHead>
              <TableHead className="whitespace-nowrap">模型倍率</TableHead>
              <TableHead className="whitespace-nowrap">用户消耗积分</TableHead>
              <TableHead className="whitespace-nowrap">预估利润率</TableHead>
              <TableHead className="whitespace-nowrap">计算方式</TableHead>
              <TableHead className="whitespace-nowrap text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(ch => {
              const draft   = editing[ch.id] ?? {};
              const pricing = ch.pricing;
              const isAuto  = draft.is_auto_calc ?? pricing?.is_auto_calc ?? true;
              const base    = Number(draft.base_credits ?? pricing?.base_credits ?? 10);
              const mult    = Number(draft.multiplier   ?? pricing?.multiplier   ?? 1.0);
              const manual  = Number(draft.user_credits ?? pricing?.user_credits ?? 10);
              const display = isAuto ? calcUserCredits(base, mult) : manual;
              const isDirty = Object.keys(draft).length > 0;

              return (
                <TableRow key={ch.id} className={isDirty ? 'bg-primary/5' : ''}>
                  <TableCell className="whitespace-nowrap">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{ch.name}</p>
                      <div className="flex items-center gap-1.5">
                        {providerBadge(ch.provider_type)}
                        {!ch.enabled && <Badge variant="secondary" className="text-xs">已禁用</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-amber-500 font-medium">¥{Number(ch.cost_per_call).toFixed(4)}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Input
                      type="number" min="1" className="w-20 h-8 text-sm"
                      value={base}
                      onChange={e => handleEdit(ch.id, 'base_credits', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Input
                      type="number" min="0.1" step="0.1" className="w-20 h-8 text-sm"
                      value={mult}
                      onChange={e => handleEdit(ch.id, 'multiplier', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {isAuto ? (
                      <span className="text-green-400 font-bold text-base">{display}</span>
                    ) : (
                      <Input
                        type="number" min="1" className="w-20 h-8 text-sm"
                        value={manual}
                        onChange={e => handleEdit(ch.id, 'user_credits', e.target.value)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={Number(profitRatio(Number(ch.cost_per_call), display).replace('%', '')) > 0 ? 'text-green-400' : 'text-destructive'}>
                      <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                      {profitRatio(Number(ch.cost_per_call), display)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isAuto}
                        onCheckedChange={v => handleEdit(ch.id, 'is_auto_calc', v)}
                      />
                      <span className="text-xs text-muted-foreground">{isAuto ? '自动' : '手动'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      size="sm" variant={isDirty ? 'default' : 'outline'}
                      className="h-8"
                      disabled={saving === ch.id || !isDirty}
                      onClick={() => handleSave(ch)}
                    >
                      {saving === ch.id ? '保存中…' : '保存'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────
export default function AdminChannelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-primary" />渠道管理
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          管理接入的AI生成平台渠道，设置API密钥、成本价与用户积分定价
        </p>
      </div>

      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">渠道配置</TabsTrigger>
          <TabsTrigger value="pricing">积分定价</TabsTrigger>
        </TabsList>
        <TabsContent value="channels" className="mt-4">
          <ChannelsTab />
        </TabsContent>
        <TabsContent value="pricing" className="mt-4">
          <PricingTab />
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/20 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-muted-foreground">
          <CardDescription className="text-xs space-y-1">
            <p>• <strong className="text-foreground">即梦AI / 火山引擎豆包</strong>：前往 <code className="bg-muted px-1 rounded">console.volcengine.com</code> 创建 AccessKey，填入 api_key (ID) + api_secret (Secret)</p>
            <p>• <strong className="text-foreground">阿里云通义万相</strong>：前往 <code className="bg-muted px-1 rounded">dashscope.aliyun.com</code> 申请 API Key，仅填 api_key</p>
            <p>• <strong className="text-foreground">RunningHub</strong>：前往 <code className="bg-muted px-1 rounded">runninghub.cn</code> 获取 API Key，填入 api_key；model_id 填工作流ID</p>
            <p>• <strong className="text-foreground">盈利公式</strong>：利润率 = (用户积分÷10 - 单次成本) ÷ (用户积分÷10)，建议利润率 &gt; 60%</p>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 工具 ────────────────────────────────────────────────────────
function maskKey(key: string): string {
  if (!key) return '（未填写）';
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
