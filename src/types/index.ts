export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'user' | 'agent2' | 'agent1' | 'admin';
export type AgentLevel = 'none' | 'agent2' | 'agent1';
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
export type WorkType = 'novel_to_comic' | 'video_to_anime';
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
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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
  balance_after: number;
  type: string;
  remark: string | null;
  order_id: string | null;
  created_at: string;
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
