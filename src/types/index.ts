export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'user' | 'agent2' | 'agent1' | 'admin';
export type AgentLevel = 'none' | 'agent2' | 'agent1';
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
export type WorkType = 'novel_to_comic' | 'video_to_anime' | 'motion_transfer';
export type WorkStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  credits: number;
  agent_level: AgentLevel;
  agent_fee_paid: boolean;
  referrer_id: string | null;
  promo_code: string | null;
  invite_code?: string;
  inviter_id?: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  rebate_credits_frozen?: number;
  rebate_credits_available?: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  price: number;
  credits: number;
  bonus_credits: number;
  bonus_pct: number;
  is_enterprise: boolean;
  validity_days: number | null;
  max_members: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/** 基础参数配置（积分汇率、利润率等） */
export interface PricingConfig {
  id: string;
  key: string;
  value: number;
  label: string;
  unit: string;
  remark: string;
  updated_at: string;
}

/** API 成本记录 */
export interface ApiCost {
  id: string;
  feature_name: string;
  provider: string;
  cost_per_call: number;
  unit: string;
  remark: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** 积分消耗映射 */
export interface PointCostMapping {
  id: string;
  feature_name: string;
  api_cost_id: string | null;
  base_credits: number;
  formula: string;
  is_locked: boolean;
  lock_reason: string;
  sort_order: number;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  package_id: string | null;
  order_no: string;
  amount: number;
  credits: number;
  status: OrderStatus;
  pay_method: string | null;
  paid_at: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
  credit_packages?: CreditPackage;
}

export interface CreditLog {
  id: string;
  user_id: string;
  amount: number;
  balance_after?: number;
  type: string;
  remark?: string | null;
  description?: string;
  order_id?: string | null;
  created_at: string;
  p_type?: string;
  expired_at?: string;
}

export interface Work {
  id: string;
  user_id: string;
  title: string;
  type: WorkType;
  status: WorkStatus;
  input_text: string | null;
  input_file_url: string | null;
  style: string;
  resolution: string;
  duration_seconds: number | null;
  estimated_credits: number | null;
  actual_credits: number | null;
  scenes: Scene[] | null;
  characters: Character[] | null;
  result_url: string | null;
  thumbnail_url: string | null;
  copyright_agreed: boolean;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  order: number;
  text: string;
  image_url?: string;
  confirmed: boolean;
}

export interface Character {
  id: string;
  name: string;
  seed?: number;
  reference_url?: string;
  description?: string;
}

export interface AgentConfig {
  id: string;
  level: AgentLevel;
  name: string;
  fee: number;
  rebate_pct: number;
  upgrade_condition: string | null;
  min_referrals: number;
  min_sales: number;
  description: string | null;
  benefits: string[];
  created_at: string;
  updated_at: string;
}

export interface RebateLog {
  id: string;
  agent_id: string;
  from_user_id: string;
  order_id: string;
  order_amount: number;
  rebate_pct: number;
  rebate_amount: number;
  status: string;
  settled_at: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  agent_id: string;
  amount: number;
  status: WithdrawalStatus;
  account_info: { type: string; account: string; name: string };
  remark: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── 模型渠道管理 ──────────────────────────────────────────────
export type ProviderType = 'volc' | 'aliyun' | 'jimeng' | 'runninghub' | 'openai';
export type FeatureType  = 'text_to_image' | 'image_to_video' | 'text_to_video';
export type GenTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface ModelChannel {
  id:            string;
  name:          string;
  provider_type: ProviderType;
  model_id:      string;
  api_key:       string;
  api_secret:    string;
  endpoint:      string;
  feature_type:  FeatureType;
  cost_per_call: number;
  enabled:       boolean;
  sort_order:    number;
  remark:        string;
  created_at:    string;
  updated_at:    string;
  pricing?:      ModelPricing;
}

export interface ModelPricing {
  id:           string;
  channel_id:   string;
  base_credits: number;
  multiplier:   number;
  user_credits: number;
  is_auto_calc: boolean;
  created_at:   string;
  updated_at:   string;
}

export interface GenerationTask {
  id:               string;
  user_id:          string;
  channel_id:       string | null;
  feature_type:     FeatureType;
  status:           GenTaskStatus;
  credits_charged:  number;
  prompt:           string;
  params:           Record<string, unknown>;
  result_urls:      string[];
  error_msg:        string;
  external_task_id: string;
  created_at:       string;
  updated_at:       string;
}

export interface ShowcaseWork {
  id: string;
  title: string;
  description: string | null;
  type: WorkType;
  thumbnail_url: string | null;
  video_url: string | null;
  tags: string[];
  view_count: number;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PromoMaterial {
  id: string;
  title: string;
  type: string;
  file_url: string;
  thumbnail_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}


