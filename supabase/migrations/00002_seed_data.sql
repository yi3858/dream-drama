
-- 积分充值套餐数据
INSERT INTO public.credit_packages (name, price, credits, bonus_credits, bonus_pct, is_enterprise, validity_days, max_members, sort_order) VALUES
('入门包', 39, 400, 0, 0, false, NULL, NULL, 1),
('基础包', 99, 1000, 30, 3, false, NULL, NULL, 2),
('进阶包', 399, 4000, 200, 5, false, NULL, NULL, 3),
('专业包', 999, 10000, 700, 7, false, NULL, NULL, 4),
('企业基础版', 5000, 50000, 6000, 12, true, 90, 10, 5),
('企业标准版', 10000, 100000, 14000, 14, true, 90, 30, 6),
('企业专业版', 20000, 200000, 34000, 17, true, 90, 100, 7),
('企业旗舰版', 50000, 500000, 110000, 22, true, 90, 500, 8);

-- 代理等级配置
INSERT INTO public.agent_configs (level, name, fee, rebate_pct, upgrade_condition, min_referrals, min_sales, description, benefits) VALUES
('agent2', '二级代理', 299, 8, '推广满50人或累计成交满5000元可升级一级代理', 10, 1000, '适合个人创作者、自媒体博主入门推广', '["专属推广链接", "8%订单返点", "官方推广素材", "代理群支持", "月结算周期"]'::jsonb),
('agent1', '一级代理', 999, 15, '顶级代理，享受最高权益', 50, 5000, '适合MCN机构、内容平台、渠道商深度合作', '["专属推广链接", "15%订单返点", "独家区域授权", "优先客服支持", "周结算周期", "推广素材定制", "专属对接经理"]'::jsonb);

-- 系统配置
INSERT INTO public.system_configs (key, value, description) VALUES
('rebate_settle_days', '7', '返点结算周期（天）'),
('min_withdrawal', '100', '最低提现金额（元）'),
('credit_per_second_720p', '1', '720P每秒积分消耗'),
('credit_per_second_1080p', '1.8', '1080P每秒积分倍率'),
('credit_per_second_4k', '3.5', '4K每秒积分倍率'),
('base_start_credits', '10', '基础启动积分'),
('ai_watermark_enabled', 'true', '是否强制AI水印'),
('content_audit_enabled', 'true', '是否开启内容安全审核');

-- 示例展示作品
INSERT INTO public.showcase_works (title, description, type, thumbnail_url, tags, view_count, is_featured, sort_order) VALUES
('都市玄幻·天元录', '玄幻小说改编动漫，画风精美，分镜流畅', 'novel_to_comic', 'placeholder-showcase-1.jpg', ARRAY['玄幻', '都市', '热血'], 12840, true, 1),
('甜蜜恋爱·雨后阳光', '现代言情短剧转动漫，画面细腻唯美', 'video_to_anime', 'placeholder-showcase-2.jpg', ARRAY['言情', '甜宠', '治愈'], 9630, true, 2),
('古风侠义·江湖行', '古风武侠题材，3D国漫风格转换', 'novel_to_comic', 'placeholder-showcase-3.jpg', ARRAY['古风', '武侠', '江湖'], 8210, true, 3),
('科幻冒险·星际迷途', '硬科幻题材，写实风格AI渲染', 'video_to_anime', 'placeholder-showcase-4.jpg', ARRAY['科幻', '冒险', '太空'], 7540, false, 4),
('校园青春·那年夏天', '校园青春剧转二次元，清新风格', 'video_to_anime', 'placeholder-showcase-5.jpg', ARRAY['青春', '校园', '二次元'], 15600, true, 5),
('奇幻世界·龙与魔法', '西方奇幻题材，欧美漫画风格', 'novel_to_comic', 'placeholder-showcase-6.jpg', ARRAY['奇幻', '魔法', '冒险'], 6780, false, 6);

-- 推广素材
INSERT INTO public.promo_materials (title, type, file_url, description, sort_order) VALUES
('官方宣传海报A4', 'poster', 'placeholder-poster-1.jpg', '高清A4竖版宣传海报，适合朋友圈分享', 1),
('横版Banner 1200x628', 'banner', 'placeholder-banner-1.jpg', '社交媒体横版Banner，适合公众号头图', 2),
('产品介绍短视频', 'video', 'placeholder-video-1.mp4', '60秒产品功能演示短视频', 3),
('推广话术文案包', 'text', 'placeholder-text-1.txt', '适配不同场景的推广话术合集', 4);
