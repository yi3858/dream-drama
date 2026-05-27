
-- works 表新增审核状态字段
ALTER TABLE public.works ADD COLUMN review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected'));

-- 新增每日生成次数上限配置
INSERT INTO public.system_configs (key, value, description)
VALUES ('daily_gen_limit', '10', '单用户每日最大生成任务次数（防刷）')
ON CONFLICT (key) DO NOTHING;

-- 补充 AI 水印和内容审核配置
INSERT INTO public.system_configs (key, value, description)
VALUES
  ('ai_watermark_enabled', 'true', '是否强制添加"AI生成"水印（true/false）'),
  ('content_audit_enabled', 'true', '是否开启内容安全审核（true/false）'),
  ('base_start_credits', '10', '每次生成的基础启动积分（固定消耗）')
ON CONFLICT (key) DO NOTHING;

-- 种子数据：推广素材示例
INSERT INTO public.promo_materials (title, type, description, file_url, is_active, sort_order)
VALUES
  ('官方推广海报 - 科幻版', 'poster', '适合朋友圈和微博发布的竖版海报，突出AI漫剧特色', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800', true, 1),
  ('官方推广横幅 - 标准版', 'banner', '适合网站和APP内嵌的横版Banner图，1200×300px', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200', true, 2),
  ('推广话术模板 - 通用版', 'text', '可直接复制使用的朋友圈/群发推广文案，包含核心卖点', 'https://miaoda.ai/promo/text-template.txt', true, 3),
  ('平台介绍样片 - 60秒', 'video', 'AI漫剧生成效果展示视频，适合发抖音/快手/视频号', 'https://miaoda.ai/promo/demo-video.mp4', true, 4)
ON CONFLICT DO NOTHING;
