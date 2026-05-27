import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import type { PricingConfig, ApiCost, PointCostMapping, CreditPackage } from '@/types';
import {
  Settings, DollarSign, Zap, Package,
  Plus, Pencil, Trash2, Save, RefreshCw, Lock, Unlock, Info,
} from 'lucide-react';

// ─── 基础参数设置 Tab ─────────────────────────────────────────────
function BasicParamsTab() {
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('pricing_config').select('*').order('key');
    setConfigs(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (key: string, val: string) => {
    setEditing(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, val] of Object.entries(editing)) {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) { toast.error(`参数值无效：${key}`); setSaving(false); return; }
        // 利润率不能超过100%（即 1.0）
        if (key === 'profit_rate' && (num < 0 || num > 1)) {
          toast.error('利润率范围应为 0% ~ 100%（填0.30表示30%）'); setSaving(false); return;
        }
        // 积分汇率不能为0
        if (key === 'exchange_rate' && num <= 0) {
          toast.error('积分汇率必须大于0'); setSaving(false); return;
        }
        await supabase.from('pricing_config')
          .update({ value: num, updated_at: new Date().toISOString() })
          .eq('key', key);
      }
      setEditing({});
      await load();
      toast.success('基础参数已保存');
    } catch { toast.error('保存失败，请重试'); }
    finally { setSaving(false); }
  };

  const hasChanges = Object.keys(editing).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">基础参数设置</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            积分汇率与利润率是全平台积分定价的锚点，修改后建议同步更新积分消耗映射。
          </p>
        </div>
        <Button
          className="gradient-primary-bg border-0 text-white hover:opacity-90 shrink-0"
          disabled={!hasChanges || saving}
          onClick={handleSave}
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map(cfg => {
          const val = editing[cfg.key] ?? String(cfg.value);
          const isEdited = cfg.key in editing;
          return (
            <Card key={cfg.id} className={isEdited ? 'border-primary/40' : ''}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cfg.remark}</p>
                  </div>
                  {isEdited && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">已修改</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={val}
                    onChange={e => handleEdit(cfg.key, e.target.value)}
                    className="h-9 flex-1"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">{cfg.unit}</span>
                </div>
                {cfg.key === 'profit_rate' && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    填写小数，如30%请填 0.30
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── API 成本设置 Tab ─────────────────────────────────────────────
interface ApiCostDialogProps {
  open: boolean;
  initial?: ApiCost | null;
  onClose: () => void;
  onSaved: () => void;
}

function ApiCostDialog({ open, initial, onClose, onSaved }: ApiCostDialogProps) {
  const [form, setForm] = useState<Partial<ApiCost>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? { ...initial } : { feature_name: '', provider: '', cost_per_call: 0, unit: '元/次', remark: '', sort_order: 0 });
  }, [initial, open]);

  const handleSave = async () => {
    if (!form.feature_name?.trim()) { toast.error('功能名称不能为空'); return; }
    const cost = Number(form.cost_per_call);
    if (isNaN(cost) || cost < 0) { toast.error('单次成本不能为负数'); return; }
    setSaving(true);
    try {
      const payload = {
        feature_name: form.feature_name!.trim(),
        provider: form.provider ?? '',
        cost_per_call: cost,
        unit: form.unit ?? '元/次',
        remark: form.remark ?? '',
        sort_order: Number(form.sort_order) || 0,
        updated_at: new Date().toISOString(),
      };
      if (initial?.id) {
        await supabase.from('api_costs').update(payload).eq('id', initial.id);
      } else {
        await supabase.from('api_costs').insert(payload);
      }
      toast.success(initial ? '已更新' : '已新增');
      onSaved();
    } catch { toast.error('保存失败'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑 API 成本' : '新增 API 成本'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[
            { label: '功能名称 *', key: 'feature_name', type: 'text', placeholder: '如：文生图' },
            { label: '服务商', key: 'provider', type: 'text', placeholder: '如：RunningHub' },
            { label: '单次成本（元）*', key: 'cost_per_call', type: 'number', placeholder: '0.02' },
            { label: '单位', key: 'unit', type: 'text', placeholder: '元/次' },
            { label: '备注', key: 'remark', type: 'text', placeholder: '可选说明' },
            { label: '排序', key: 'sort_order', type: 'number', placeholder: '0' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm font-normal">{label}</Label>
              <Input
                type={type}
                placeholder={placeholder}
                value={String((form as Record<string, unknown>)[key] ?? '')}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="h-9"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" disabled={saving} onClick={handleSave}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApiCostsTab() {
  const [costs, setCosts] = useState<ApiCost[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; item?: ApiCost | null }>({ open: false });
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('api_costs').select('*').order('sort_order');
    setCosts(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此条成本记录？')) return;
    setDeleting(id);
    await supabase.from('api_costs').delete().eq('id', id);
    await load();
    setDeleting(null);
    toast.success('已删除');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">API 成本设置</h3>
          <p className="text-sm text-muted-foreground mt-0.5">记录各功能模块的第三方 API 单次调用成本，供积分定价参考。</p>
        </div>
        <Button className="gradient-primary-bg border-0 text-white hover:opacity-90 h-9" onClick={() => setDialog({ open: true, item: null })}>
          <Plus className="w-4 h-4 mr-1" /> 新增
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">功能名称</TableHead>
              <TableHead className="whitespace-nowrap">服务商</TableHead>
              <TableHead className="whitespace-nowrap">单次成本</TableHead>
              <TableHead className="whitespace-nowrap">单位</TableHead>
              <TableHead className="whitespace-nowrap">备注</TableHead>
              <TableHead className="whitespace-nowrap text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">暂无数据</TableCell>
              </TableRow>
            )}
            {costs.map(c => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap font-medium">{c.feature_name}</TableCell>
                <TableCell className="whitespace-nowrap">{c.provider || '-'}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-sm">¥{Number(c.cost_per_call).toFixed(4)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{c.unit}</TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[160px] truncate">{c.remark || '-'}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDialog({ open: true, item: c })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      disabled={deleting === c.id}
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ApiCostDialog
        open={dialog.open}
        initial={dialog.item}
        onClose={() => setDialog({ open: false })}
        onSaved={() => { setDialog({ open: false }); load(); }}
      />
    </div>
  );
}

// ─── 积分消耗映射 Tab ──────────────────────────────────────────────
function PointMappingTab() {
  const [mappings, setMappings] = useState<PointCostMapping[]>([]);
  const [apiCosts, setApiCosts] = useState<ApiCost[]>([]);
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [editingCredits, setEditingCredits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: m }, { data: a }, { data: c }] = await Promise.all([
      supabase.from('point_cost_mapping').select('*').order('sort_order'),
      supabase.from('api_costs').select('*').order('sort_order'),
      supabase.from('pricing_config').select('*'),
    ]);
    setMappings(m ?? []);
    setApiCosts(a ?? []);
    setConfigs(c ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getConfig = (key: string) => configs.find(c => c.key === key)?.value ?? 0;

  const getSuggestedCredits = (m: PointCostMapping) => {
    const cost = apiCosts.find(a => a.feature_name === m.feature_name);
    if (!cost) return m.base_credits;
    const rate = getConfig('exchange_rate');
    const profit = getConfig('profit_rate');
    return Math.ceil(Number(cost.cost_per_call) * rate * (1 + profit));
  };

  const handleToggleLock = async (m: PointCostMapping) => {
    const { error } = await supabase
      .from('point_cost_mapping')
      .update({ is_locked: !m.is_locked, updated_at: new Date().toISOString() })
      .eq('id', m.id);
    if (error) { toast.error('操作失败'); return; }
    await load();
    toast.success(m.is_locked ? '已解锁，将跟随成本自动计算' : '已锁定手动值');
  };

  const handleSaveCredits = async (m: PointCostMapping) => {
    const val = editingCredits[m.id];
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) { toast.error('积分值不能为负'); return; }
    setSaving(m.id);
    const { error } = await supabase
      .from('point_cost_mapping')
      .update({ base_credits: num, is_locked: true, updated_at: new Date().toISOString() })
      .eq('id', m.id);
    setSaving(null);
    if (error) { toast.error('保存失败'); return; }
    setEditingCredits(prev => { const n = { ...prev }; delete n[m.id]; return n; });
    await load();
    toast.success('已保存并锁定');
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">积分消耗映射</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          建议积分 = 单次成本 × 积分汇率 × (1 + 利润率)。未锁定时自动跟随成本变化；手动修改后自动锁定。
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">功能名称</TableHead>
              <TableHead className="whitespace-nowrap">建议积分</TableHead>
              <TableHead className="whitespace-nowrap">当前积分</TableHead>
              <TableHead className="whitespace-nowrap">计算公式</TableHead>
              <TableHead className="whitespace-nowrap">锁定状态</TableHead>
              <TableHead className="whitespace-nowrap text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">暂无数据</TableCell>
              </TableRow>
            )}
            {mappings.map(m => {
              const suggested = getSuggestedCredits(m);
              const editVal = editingCredits[m.id];
              const displayCredits = editVal ?? String(m.is_locked ? m.base_credits : suggested);
              const isDifferent = m.is_locked && Number(m.base_credits) !== suggested;

              return (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap font-medium">{m.feature_name}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-sm text-primary">{suggested}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        className="h-8 w-20 font-mono text-sm"
                        value={displayCredits}
                        onChange={e => setEditingCredits(prev => ({ ...prev, [m.id]: e.target.value }))}
                      />
                      {isDifferent && (
                        <span className="text-xs text-amber-500 shrink-0">≠建议值</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[160px] truncate">{m.formula}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {m.is_locked
                      ? <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1 text-xs"><Lock className="w-3 h-3" />已锁定</Badge>
                      : <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-xs"><Unlock className="w-3 h-3" />自动</Badge>
                    }
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingCredits[m.id] !== undefined && (
                        <Button
                          size="sm"
                          className="h-8 gradient-primary-bg border-0 text-white hover:opacity-90"
                          disabled={saving === m.id}
                          onClick={() => handleSaveCredits(m)}
                        >
                          <Save className="w-3 h-3 mr-1" />保存
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0"
                        title={m.is_locked ? '解锁（跟随自动计算）' : '锁定（使用手动值）'}
                        onClick={() => handleToggleLock(m)}
                      >
                        {m.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
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

// ─── 套餐价格管理 Tab ─────────────────────────────────────────────
interface PackageDialogProps {
  open: boolean;
  initial?: CreditPackage | null;
  onClose: () => void;
  onSaved: () => void;
}

function PackageDialog({ open, initial, onClose, onSaved }: PackageDialogProps) {
  const [form, setForm] = useState<Partial<CreditPackage>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? { ...initial } : {
      name: '', price: 0, credits: 0, bonus_credits: 0,
      bonus_pct: 0, is_enterprise: false, validity_days: null,
      max_members: null, sort_order: 0, is_active: true,
    });
  }, [initial, open]);

  const set = (key: keyof CreditPackage, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('套餐名称不能为空'); return; }
    const price = Number(form.price);
    const credits = Number(form.credits);
    if (isNaN(price) || price < 0) { toast.error('价格不能为负'); return; }
    if (isNaN(credits) || credits <= 0) { toast.error('积分数量必须大于0'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name!.trim(),
        price,
        credits,
        bonus_credits: Number(form.bonus_credits) || 0,
        bonus_pct: Number(form.bonus_pct) || 0,
        is_enterprise: form.is_enterprise ?? false,
        validity_days: form.validity_days ? Number(form.validity_days) : null,
        max_members: form.max_members ? Number(form.max_members) : null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active ?? true,
      };
      if (initial?.id) {
        await supabase.from('credit_packages').update(payload).eq('id', initial.id);
      } else {
        await supabase.from('credit_packages').insert(payload);
      }
      toast.success(initial ? '套餐已更新' : '套餐已新增');
      onSaved();
    } catch { toast.error('保存失败'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg overflow-y-auto max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑套餐' : '新增套餐'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {[
            { label: '套餐名称 *', key: 'name', type: 'text', placeholder: '如：基础包 100积分' },
            { label: '价格（元）*', key: 'price', type: 'number', placeholder: '9.9' },
            { label: '赠送积分总量 *', key: 'credits', type: 'number', placeholder: '100' },
            { label: '赠送额外积分', key: 'bonus_credits', type: 'number', placeholder: '0' },
            { label: '额外赠送比例（%）', key: 'bonus_pct', type: 'number', placeholder: '0' },
            { label: '有效期（天，空=永久）', key: 'validity_days', type: 'number', placeholder: '留空为永久' },
            { label: '最大成员数（企业包）', key: 'max_members', type: 'number', placeholder: '留空不限' },
            { label: '排序', key: 'sort_order', type: 'number', placeholder: '0' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm font-normal">{label}</Label>
              <Input
                type={type}
                placeholder={placeholder}
                value={String((form as Record<string, unknown>)[key] ?? '')}
                onChange={e => set(key as keyof CreditPackage, e.target.value === '' ? null : e.target.value)}
                className="h-9"
              />
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <Label className="text-sm font-normal">企业套餐</Label>
            <Switch
              checked={form.is_enterprise ?? false}
              onCheckedChange={v => set('is_enterprise', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">启用状态</Label>
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={v => set('is_active', v)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button className="gradient-primary-bg border-0 text-white hover:opacity-90" disabled={saving} onClick={handleSave}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackagesTab() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; item?: CreditPackage | null }>({ open: false });
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('credit_packages').select('*').order('sort_order');
    setPackages(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (pkg: CreditPackage) => {
    setToggling(pkg.id);
    await supabase.from('credit_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
    await load();
    setToggling(null);
    toast.success(pkg.is_active ? '套餐已停用' : '套餐已启用');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此套餐？删除后充值页面将不再显示。')) return;
    setDeleting(id);
    await supabase.from('credit_packages').delete().eq('id', id);
    await load();
    setDeleting(null);
    toast.success('已删除');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">套餐价格管理</h3>
          <p className="text-sm text-muted-foreground mt-0.5">管理充值套餐，已启用的套餐将展示在充值页面供用户购买。</p>
        </div>
        <Button className="gradient-primary-bg border-0 text-white hover:opacity-90 h-9" onClick={() => setDialog({ open: true, item: null })}>
          <Plus className="w-4 h-4 mr-1" /> 新增套餐
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">套餐名称</TableHead>
              <TableHead className="whitespace-nowrap">价格</TableHead>
              <TableHead className="whitespace-nowrap">积分</TableHead>
              <TableHead className="whitespace-nowrap">额外赠送</TableHead>
              <TableHead className="whitespace-nowrap">有效期</TableHead>
              <TableHead className="whitespace-nowrap">类型</TableHead>
              <TableHead className="whitespace-nowrap">状态</TableHead>
              <TableHead className="whitespace-nowrap text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">暂无套餐，点击右上角新增</TableCell>
              </TableRow>
            )}
            {packages.map(pkg => (
              <TableRow key={pkg.id}>
                <TableCell className="whitespace-nowrap font-medium">{pkg.name}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-sm">¥{Number(pkg.price).toFixed(2)}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-sm text-primary">{pkg.credits.toLocaleString()}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {pkg.bonus_credits > 0 ? `+${pkg.bonus_credits}` : pkg.bonus_pct > 0 ? `+${pkg.bonus_pct}%` : '-'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {pkg.validity_days ? `${pkg.validity_days}天` : '永久'}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={pkg.is_enterprise ? 'secondary' : 'outline'} className="text-xs">
                    {pkg.is_enterprise ? '企业' : '个人'}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Switch
                    checked={pkg.is_active}
                    disabled={toggling === pkg.id}
                    onCheckedChange={() => handleToggleActive(pkg)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDialog({ open: true, item: pkg })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      disabled={deleting === pkg.id}
                      onClick={() => handleDelete(pkg.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PackageDialog
        open={dialog.open}
        initial={dialog.item}
        onClose={() => setDialog({ open: false })}
        onSaved={() => { setDialog({ open: false }); load(); }}
      />
    </div>
  );
}

// ─── 页面主体 ─────────────────────────────────────────────────────
export default function AdminPricingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg gradient-primary-bg flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">定价与成本管理</h1>
          <p className="text-sm text-muted-foreground">配置积分汇率、API 成本、积分消耗映射及充值套餐</p>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="basic" className="gap-1.5 text-xs md:text-sm py-2">
            <Settings className="w-3.5 h-3.5" /> 基础参数
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-1.5 text-xs md:text-sm py-2">
            <DollarSign className="w-3.5 h-3.5" /> API成本
          </TabsTrigger>
          <TabsTrigger value="mapping" className="gap-1.5 text-xs md:text-sm py-2">
            <Zap className="w-3.5 h-3.5" /> 积分映射
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5 text-xs md:text-sm py-2">
            <Package className="w-3.5 h-3.5" /> 套餐管理
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-4 md:p-6">
            <TabsContent value="basic" className="mt-0"><BasicParamsTab /></TabsContent>
            <TabsContent value="costs" className="mt-0"><ApiCostsTab /></TabsContent>
            <TabsContent value="mapping" className="mt-0"><PointMappingTab /></TabsContent>
            <TabsContent value="packages" className="mt-0"><PackagesTab /></TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
