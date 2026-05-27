
-- ═══════════════════════════════════════════════════════════════
-- 渠道管理表：存储各AI平台的API配置
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE model_channels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,                -- 渠道显示名称
  provider_type text        NOT NULL,                -- volc | aliyun | jimeng | runninghub | openai
  model_id      text        NOT NULL DEFAULT '',     -- 模型ID/名称
  api_key       text        NOT NULL DEFAULT '',     -- API Key
  api_secret    text        NOT NULL DEFAULT '',     -- API Secret（部分平台需要）
  endpoint      text        NOT NULL DEFAULT '',     -- 自定义接口地址（留空用默认值）
  feature_type  text        NOT NULL,                -- text_to_image | image_to_video | text_to_video
  cost_per_call numeric(12,6) NOT NULL DEFAULT 0,   -- 单次成本价（元）
  enabled       boolean     NOT NULL DEFAULT true,
  sort_order    integer     NOT NULL DEFAULT 0,
  remark        text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_model_channels_feature  ON model_channels (feature_type, enabled);
CREATE INDEX idx_model_channels_provider ON model_channels (provider_type);

-- ═══════════════════════════════════════════════════════════════
-- 渠道定价表：每个渠道对用户的积分定价
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE model_pricing (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      uuid        NOT NULL REFERENCES model_channels(id) ON DELETE CASCADE,
  base_credits    integer     NOT NULL DEFAULT 10,   -- 基础积分消耗
  multiplier      numeric(6,2) NOT NULL DEFAULT 1.0, -- 模型倍率
  user_credits    integer     NOT NULL DEFAULT 10,   -- 实际用户支付积分（= base × multiplier，可手动覆盖）
  is_auto_calc    boolean     NOT NULL DEFAULT true, -- true=自动计算，false=手动填写
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id)
);

CREATE INDEX idx_model_pricing_channel ON model_pricing (channel_id);

-- ═══════════════════════════════════════════════════════════════
-- 生成任务记录表：记录每次生成请求
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE generation_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  channel_id      uuid        REFERENCES model_channels(id),
  feature_type    text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending',  -- pending | processing | completed | failed | refunded
  credits_charged integer     NOT NULL DEFAULT 0,
  prompt          text        NOT NULL DEFAULT '',
  params          jsonb       NOT NULL DEFAULT '{}',
  result_urls     text[]      NOT NULL DEFAULT '{}',
  error_msg       text        NOT NULL DEFAULT '',
  external_task_id text       NOT NULL DEFAULT '',         -- 外部平台返回的任务ID
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gen_tasks_user    ON generation_tasks (user_id, created_at DESC);
CREATE INDEX idx_gen_tasks_status  ON generation_tasks (status);
CREATE INDEX idx_gen_tasks_channel ON generation_tasks (channel_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS 策略
-- ═══════════════════════════════════════════════════════════════

-- model_channels：仅管理员可读写
ALTER TABLE model_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_model_channels" ON model_channels
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- model_pricing：仅管理员可写，普通用户可读启用渠道
ALTER TABLE model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_model_pricing" ON model_pricing
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_read_model_pricing" ON model_pricing
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM model_channels mc
      WHERE mc.id = model_pricing.channel_id AND mc.enabled = true
    )
  );

-- generation_tasks：用户只能查看自己的记录，管理员全量
ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_gen_tasks" ON generation_tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_insert_gen_tasks" ON generation_tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_all_gen_tasks" ON generation_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════
-- 默认内置渠道数据（演示配置，管理员在后台填入真实API Key）
-- ═══════════════════════════════════════════════════════════════
INSERT INTO model_channels (name, provider_type, model_id, endpoint, feature_type, cost_per_call, enabled, sort_order, remark) VALUES
  ('即梦AI - 图片生成',     'jimeng',     'high_aes_general_v21',    'https://visual.volcengineapi.com',         'text_to_image', 0.04, false, 10, '字节跳动即梦AI，需填入火山引擎API Key/Secret'),
  ('火山引擎豆包 - 文生图', 'volc',       'doubao-seedream-3-0-t2i', 'https://visual.volcengineapi.com',         'text_to_image', 0.05, false, 20, '火山引擎豆包大模型，需填入AccessKeyId/SecretAccessKey'),
  ('阿里云通义万相',        'aliyun',     'wanx2.1-t2i-turbo',       'https://dashscope.aliyuncs.com/api/v1',    'text_to_image', 0.04, false, 30, '阿里云通义万相，需填入DashScope API Key'),
  ('RunningHub - 文生图',   'runninghub', 'text-to-image-fast',      'https://www.runninghub.cn',                'text_to_image', 0.02, true,  40, '当前主用渠道，需填入RunningHub API Key'),
  ('即梦AI - 图生视频',     'jimeng',     'high_aes_general_v21',    'https://visual.volcengineapi.com',         'image_to_video', 0.50, false, 50, '字节跳动即梦AI视频生成'),
  ('RunningHub - 图生视频', 'runninghub', 'image-to-video',          'https://www.runninghub.cn',                'image_to_video', 0.20, true,  60, '当前主用视频渠道');

-- 为默认渠道创建定价记录
INSERT INTO model_pricing (channel_id, base_credits, multiplier, user_credits, is_auto_calc)
SELECT id,
  CASE feature_type
    WHEN 'text_to_image'  THEN 10
    WHEN 'image_to_video' THEN 50
    ELSE 20
  END,
  CASE name
    WHEN '即梦AI - 图片生成'     THEN 2.0
    WHEN '火山引擎豆包 - 文生图'  THEN 2.0
    WHEN '阿里云通义万相'         THEN 1.5
    WHEN 'RunningHub - 文生图'   THEN 1.0
    WHEN '即梦AI - 图生视频'      THEN 2.0
    WHEN 'RunningHub - 图生视频' THEN 1.0
    ELSE 1.0
  END,
  CASE name
    WHEN '即梦AI - 图片生成'     THEN 20
    WHEN '火山引擎豆包 - 文生图'  THEN 20
    WHEN '阿里云通义万相'         THEN 15
    WHEN 'RunningHub - 文生图'   THEN 10
    WHEN '即梦AI - 图生视频'      THEN 100
    WHEN 'RunningHub - 图生视频' THEN 50
    ELSE 10
  END,
  true
FROM model_channels;
