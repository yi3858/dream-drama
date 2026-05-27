import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Save, AlertCircle, BellRing } from 'lucide-react';

export default function AdminPointSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [configs, setConfigs] = useState({
    register_reward: 30,
    invite_inviter_reward: 20,
    invite_invitee_reward: 20,
    reward_validity_days: 30
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    const { data } = await supabase.from('point_configs').select('key, value');
    if (data) {
      const newConfigs = { ...configs };
      data.forEach(item => {
        if (item.key in newConfigs) {
          (newConfigs as any)[item.key] = item.value;
        }
      });
      setConfigs(newConfigs);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const updates = Object.entries(configs).map(([key, value]) => ({
        key,
        value,
        updated_by: user.id
      }));

      for (const update of updates) {
        await supabase
          .from('point_configs')
          .update({ value: update.value, updated_by: update.updated_by })
          .eq('key', update.key);
      }

      await supabase.from('admin_operation_logs').insert({
        admin_id: user.id,
        action_type: 'update_point_configs',
        target_id: 'point_configs',
        details: configs
      });

      toast.success('配置已保存并实时生效');
    } catch (error) {
      console.error(error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleNotify = async () => {
    setNotifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify_expiring_points', {
        method: 'POST',
      });
      
      if (error) {
        const errorMsg = await error?.context?.text();
        throw new Error(errorMsg || error?.message);
      }
      
      toast.success('提醒发送成功', { description: data?.message || '已成功发送过期提醒短信' });
    } catch (err: any) {
      toast.error('发送提醒失败', { description: err.message });
    } finally {
      setNotifying(false);
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">推广积分设置</h2>
        <p className="text-muted-foreground mt-2">
          配置用户注册、邀请等环节的积分赠送规则
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>活动奖励规则</CardTitle>
          <CardDescription>参数修改后将立即对新触发的事件生效</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="register_reward">新人注册礼 (积分)</Label>
              <Input
                id="register_reward"
                type="number"
                value={configs.register_reward}
                onChange={e => setConfigs({ ...configs, register_reward: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">用户完成注册并验证手机号后自动发放</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reward_validity_days">赠送积分有效期 (天)</Label>
              <Input
                id="reward_validity_days"
                type="number"
                value={configs.reward_validity_days}
                onChange={e => setConfigs({ ...configs, reward_validity_days: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">系统所有活动赠送的积分将在指定天数后自动过期</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite_inviter_reward">邀请人奖励 (积分)</Label>
              <Input
                id="invite_inviter_reward"
                type="number"
                value={configs.invite_inviter_reward}
                onChange={e => setConfigs({ ...configs, invite_inviter_reward: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">成功邀请一名新用户注册后给予邀请人的奖励</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite_invitee_reward">被邀请人奖励 (积分)</Label>
              <Input
                id="invite_invitee_reward"
                type="number"
                value={configs.invite_invitee_reward}
                onChange={e => setConfigs({ ...configs, invite_invitee_reward: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">新用户填写邀请码注册后给予该新用户的奖励</p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t mt-6">
            <div className="flex items-center gap-2 text-sm text-amber-500">
              <AlertCircle className="w-4 h-4" />
              <span>修改立即生效，建议在业务低峰期调整</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleNotify} disabled={notifying}>
                {notifying ? '发送中...' : <><BellRing className="w-4 h-4 mr-2" />发送过期提醒短信</>}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="min-w-32">
                {saving ? '保存中...' : <><Save className="w-4 h-4 mr-2" />保存配置</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}