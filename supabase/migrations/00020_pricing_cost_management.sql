
-- ─── 基础参数配置表（积分汇率、利润率等）───────────────────────
CREATE TABLE pricing_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  value      numeric(12,4) NOT NULL,
  label      text NOT NULL,
  unit       text NOT NULL DEFAULT '',
  remark     text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 预设默认值
INSERT INTO pricing_config (key, value, label, unit, remark) VALUES
  ('exchange_rate', 100,  '积分汇率', '积分/元', '1元人民币=多少积分'),
  ('profit_rate',   0.30, '利润率',   '%',        '平台利润率，0.30表示30%');

-- ─── API 成本表 ──────────────────────────────────────────────────
CREATE TABLE api_costs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name  text NOT NULL,
  provider      text NOT NULL DEFAULT '',
  cost_per_call numeric(12,6) NOT NULL DEFAULT 0,
  unit          text NOT NULL DEFAULT '元/次',
  remark        text NOT NULL DEFAULT '',
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 预设常用功能成本
INSERT INTO api_costs (feature_name, provider, cost_per_call, unit, remark, sort_order) VALUES
  ('文生图',     'RunningHub', 0.02, '元/张', '基础文生图工作流',        1),
  ('图生视频',   'RunningHub', 0.10, '元/次', 'sparkvideo-2.0-fast',    2),
  ('动作迁移',   '阿里云/字节', 0.15, '元/次', '图生动作API',            3),
  ('小说转漫剧', '豆包/阿里',  0.50, '元/分钟','含绘图+视频合成',        4),
  ('短剧转动漫', '豆包/阿里',  0.80, '元/分钟','含风格转换+剪辑',        5),
  ('广告视频',   'RunningHub', 0.12, '元/次', 'sparkvideo-2.0-fast',    6),
  ('内容安全',   '阿里云',     0.002,'元/次', '文本+图片安全检测',       7);

-- ─── 积分消耗映射表 ──────────────────────────────────────────────
CREATE TABLE point_cost_mapping (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name    text NOT NULL UNIQUE,
  api_cost_id     uuid REFERENCES api_costs(id) ON DELETE SET NULL,
  base_credits    numeric(10,2) NOT NULL DEFAULT 0,
  formula         text NOT NULL DEFAULT '自动计算',
  suggested_credits numeric(10,2) GENERATED ALWAYS AS (0) STORED, -- 前端计算，此处占位
  is_locked       boolean NOT NULL DEFAULT false,
  lock_reason     text NOT NULL DEFAULT '',
  sort_order      int NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 预设映射（base_credits 初始按默认汇率100、利润率30%计算的建议值）
INSERT INTO point_cost_mapping (feature_name, base_credits, formula, is_locked, sort_order) VALUES
  ('文生图',     3,   '单次成本×积分汇率×(1+利润率)', false, 1),
  ('图生视频',   13,  '单次成本×积分汇率×(1+利润率)', false, 2),
  ('动作迁移',   20,  '单次成本×积分汇率×(1+利润率)', false, 3),
  ('小说转漫剧', 65,  '每分钟视频成本×积分汇率×(1+利润率)', false, 4),
  ('短剧转动漫', 104, '每分钟视频成本×积分汇率×(1+利润率)', false, 5),
  ('广告视频',   16,  '单次成本×积分汇率×(1+利润率)', false, 6);

-- ─── RLS：管理员完整读写，其他角色无权访问 ──────────────────────
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_cost_mapping ENABLE ROW LEVEL SECURITY;

-- pricing_config
CREATE POLICY "admin_all_pricing_config" ON pricing_config
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- api_costs
CREATE POLICY "admin_all_api_costs" ON api_costs
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);

-- point_cost_mapping
CREATE POLICY "admin_all_point_cost_mapping" ON point_cost_mapping
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::user_role);
