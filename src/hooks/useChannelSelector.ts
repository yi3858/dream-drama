/**
 * useChannelSelector — 从 model_channels + model_pricing 获取可用渠道
 * 供 TextToImagePage / ImageToVideoPage 等页面使用
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { ModelChannel, FeatureType } from '@/types';

export interface ChannelOption {
  id:          string;
  name:        string;
  providerType: string;
  userCredits: number;    // 本次消耗积分（未乘数量倍数）
  enabled:     boolean;
}

export function useChannelSelector(featureType: FeatureType) {
  const [channels, setChannels]         = useState<ChannelOption[]>([]);
  const [selectedId, setSelectedId]     = useState<string>('');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('model_channels')
      .select('id,name,provider_type,enabled,pricing:model_pricing(user_credits)')
      .eq('feature_type', featureType)
      .eq('enabled', true)
      .order('sort_order')
      .then(({ data }) => {
        const opts: ChannelOption[] = (data ?? []).map((c: { id: string; name: string; provider_type: string; enabled: boolean; pricing: { user_credits: number }[] }) => {
          const p = Array.isArray(c.pricing) ? c.pricing[0] : null;
          return {
            id:           c.id,
            name:         c.name,
            providerType: c.provider_type,
            userCredits:  p?.user_credits ?? 10,
            enabled:      c.enabled,
          };
        });
        setChannels(opts);
        if (opts.length > 0) setSelectedId(opts[0].id);
        setLoading(false);
      });
  }, [featureType]);

  const selected = channels.find(c => c.id === selectedId) ?? null;

  return { channels, selectedId, setSelectedId, selected, loading };
}
