import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'zh' | 'en' | 'th';

type TranslationKey =
  | 'nav_novel'
  | 'nav_video'
  | 'nav_ad'
  | 'nav_t2i'
  | 'nav_i2v'
  | 'nav_motion'
  | 'nav_top_creation'
  | 'nav_top_showcase'
  | 'nav_top_trending'
  | 'nav_top_analysis'
  | 'nav_top_characters'
  | 'nav_top_pricing'
  | 'nav_top_agent'
  | 'hero_badge'
  | 'showcase_subtitle'
  | 'hero_title_1'
  | 'hero_title_2'
  | 'hero_desc_1'
  | 'hero_desc_2'
  | 'hero_desc_mobile'
  | 'btn_start'
  | 'btn_demo'
  | 'feat_title'
  | 'feat_subtitle'
  | 'feat_1_title'
  | 'feat_1_desc'
  | 'feat_2_title'
  | 'feat_2_desc'
  | 'feat_3_title'
  | 'feat_3_desc'
  | 'feat_4_title'
  | 'feat_4_desc'
  | 'feat_5_title'
  | 'feat_5_desc'
  | 'feat_6_title'
  | 'feat_6_desc'
  | 'showcase_title'
  | 'login_title'
  | 'login_desc'
  | 'phone_label'
  | 'phone_placeholder'
  | 'password_label'
  | 'password_placeholder'
  | 'btn_login'
  | 'no_account'
  | 'register_now'
  | 'register_title'
  | 'register_desc'
  | 'confirm_password'
  | 'confirm_placeholder'
  | 'agree_terms'
  | 'user_agreement'
  | 'privacy_policy'
  | 'already_have_account'
  | 'login_now'
  | 'characters_title'
  | 'characters_desc'
  | 'pricing_title'
  | 'pricing_desc'
  | 'agent_title'
  | 'agent_desc'
  | 'analysis_title'
  | 'analysis_desc'
  | 'trending_title'
  | 'trending_desc'
  | 'novel_comic_title'
  | 'novel_comic_desc'
  | 'video_anime_title'
  | 'video_anime_desc'
  | 'country_86'
  | 'country_1'
  | 'country_81'
  | 'country_82'
  | 'country_44'
  | 'country_66'
  | 'country_852'
  | 'country_886'
  | 'country_853'
  | 'pricing_personal'
  | 'pricing_enterprise'
  | 'pricing_recommended'
  | 'pricing_popular'
  | 'pricing_base_credits'
  | 'pricing_bonus_credits'
  | 'pricing_total_credits'
  | 'pricing_valid_forever'
  | 'pricing_buy_now'
  | 'pricing_validity_days'
  | 'pricing_max_members'
  | 'pricing_discount'
  | 'pricing_pay_method'
  | 'pricing_wechat_pay'
  | 'pricing_alipay'
  | 'pricing_confirm_pay'
  | 'pricing_secure_pay'
  | 'pricing_select_method'
  | 'pricing_current_credits'
  | 'agent_rebate'
  | 'agent_fee'
  | 'agent_apply_now'
  | 'agent_current_level'
  | 'agent_upgrade'
  | 'agent_how_it_works'
  | 'agent_step1_title'
  | 'agent_step1_desc'
  | 'agent_step2_title'
  | 'agent_step2_desc'
  | 'agent_step3_title'
  | 'agent_step3_desc'
  | 'agent_step4_title'
  | 'agent_step4_desc'
  | 'agent_apply_title'
  | 'agent_contact'
  | 'agent_reason'
  | 'agent_submit'
  | 'agent_cancel'
  | 'promo_code_label'
  | 'promo_code_placeholder'
  | 'agent_upgrade_cond'
  | 'agent_goto_promote'
  | 'agent_upgrade_to_agent1'
  | 'agent_surpassed'
  | 'agent_est_revenue'
  | 'agent_est_revenue_desc'
  | 'agent_promote_users'
  | 'agent_avg_recharge'
  | 'agent_est_revenue_note'
  | 'agent_feature_1_title'
  | 'agent_feature_1_desc'
  | 'agent_feature_2_title'
  | 'agent_feature_2_desc'
  | 'agent_feature_3_title'
  | 'agent_feature_3_desc'
  | 'agent_feature_4_title'
  | 'agent_feature_4_desc'
  | 'agent_feature_5_title'
  | 'agent_feature_5_desc'
  | 'agent_feature_6_title'
  | 'agent_feature_6_desc'
  | 'agent_upgrade_prefix'
  | 'agent_apply_prefix'
  | 'agent_upgrade_pay'
  | 'agent_apply_pay'
  | 'agent_submitting'
  | 'pkg_starter'
  | 'pkg_basic'
  | 'pkg_advanced'
  | 'pkg_pro'
  | 'pkg_ent_basic'
  | 'pkg_ent_std'
  | 'pkg_ent_pro'
  | 'pkg_ent_flagship'
  | 'agent_level1_name'
  | 'agent_level1_desc'
  | 'agent_level1_cond'
  | 'agent_level2_name'
  | 'agent_level2_desc'
  | 'agent_level2_cond'
  | 'agent_b_exclusive_link'
  | 'agent_b_15_rebate'
  | 'agent_b_regional'
  | 'agent_b_priority_cs'
  | 'agent_b_weekly_settle'
  | 'agent_b_custom_materials'
  | 'agent_b_exclusive_manager'
  | 'agent_b_8_rebate'
  | 'agent_b_official_materials'
  | 'agent_b_group_support'
  | 'agent_b_monthly_settle'
  | 'footer_desc'
  | 'footer_product'
  | 'footer_resources'
  | 'footer_company'
  | 'footer_legal'
  | 'footer_contact'
  | 'footer_email'
  | 'footer_wechat';

const translations: Record<Language, Record<TranslationKey, string>> = {
  zh: {
    nav_novel: '小说转漫剧',
    nav_video: '短剧转动漫',
    nav_ad: '广告制作',
    nav_t2i: '文生图',
    nav_i2v: '图生视频',
    nav_motion: '动作迁移',
    nav_top_creation: '创作中心',
    nav_top_showcase: '作品案例',
    nav_top_trending: '创作热点',
    nav_top_analysis: '爆款分析',
    nav_top_characters: '角色库',
    nav_top_pricing: '会员充值',
    nav_top_agent: '代理招商',
    hero_badge: 'AI漫剧制作新纪元 · 2026',
    hero_title_1: '让每个故事',
    hero_title_2: '都能成为漫剧',
    hero_desc_1: '专业AI驱动的漫剧制作平台 · 小说文本一键生成漫剧视频',
    hero_desc_2: '短剧实拍智能转动漫 · 3分钟出片 · 合规创作',
    hero_desc_mobile: '专业AI驱动 · 小说转漫剧 · 短剧转动漫<br />3分钟出片 · 合规创作',
    btn_start: '开始创作',
    btn_demo: '观看演示',
    feat_title: '核心功能',
    feat_subtitle: '了解 AI 漫剧制作平台如何为您赋能',
    feat_1_title: '小说转漫剧',
    feat_1_desc: '输入小说文本，AI自动分镜拆解、绘制分镜画面、合成动态漫剧视频',
    feat_2_title: '短剧转动漫',
    feat_2_desc: '上传实拍短剧素材，一键转换为精美动漫风格，自动剪辑+字幕生成',
    feat_3_title: '智能角色库',
    feat_3_desc: '保持角色特征一致性，支持自定义角色形象，让漫剧连载无缝衔接',
    feat_4_title: '多风格渲染',
    feat_4_desc: '提供日漫、国风、美漫等多种艺术风格，满足不同题材创作需求',
    feat_5_title: '快速出片',
    feat_5_desc: '强大的云端渲染引擎，将几天的制作周期缩短至几分钟',
    feat_6_title: '商业合规',
    feat_6_desc: '所有生成的素材均可商用，提供版权保障，适合商业发布与变现',
    showcase_title: '优秀作品案例',
    showcase_subtitle: '探索我们的创作者社区，激发您的创作灵感',
    characters_title: '我的角色库',
    characters_desc: '管理和创建你的专属漫剧角色',
    pricing_title: '按需购买，灵活充值',
    pricing_desc: '购买积分，解锁所有AI创作功能，没有隐藏费用',
    agent_title: '成为代理合伙人',
    agent_desc: '推广筑梦呈剧，获取高额分成收益',
    analysis_title: '全网爆款分析',
    analysis_desc: '多维度拆解热门短剧，提供创作灵感与数据支持',
    trending_title: 'AI漫剧创作热点',
    trending_desc: '实时抓取全网热点，洞察下一部爆款方向',
    novel_comic_title: '小说转漫剧',
    novel_comic_desc: '输入文本，AI自动分镜并生成配套画面、配音和字幕',
    video_anime_title: '短剧转动漫',
    video_anime_desc: '上传实拍短剧，一键转换为专属动漫风格',
    login_title: '欢迎回来',
    login_desc: '登录账号，继续你的AI创作之旅',
    phone_label: '手机号',
    phone_placeholder: '输入手机号',
    password_label: '密码',
    password_placeholder: '请输入密码',
    btn_login: '登录',
    no_account: '还没有账号？',
    register_now: '立即注册',
    register_title: '创建账号',
    register_desc: '加入我们，开启AI漫剧创作之旅',
    confirm_password: '确认密码',
    confirm_placeholder: '请再次输入密码',
    agree_terms: '我已阅读并同意',
    user_agreement: '《用户协议》',
    privacy_policy: '《隐私政策》',
    already_have_account: '已有账号？',
    login_now: '立即登录',
    country_86: '中国',
    country_1: '美加',
    country_81: '日本',
    country_82: '韩国',
    country_44: '英国',
    country_66: '泰国',
    country_852: '香港',
    country_886: '台湾',
    country_853: '澳门',
    pricing_personal: '个人版',
    pricing_enterprise: '企业版',
    pricing_recommended: '推荐',
    pricing_popular: '最受欢迎',
    pricing_base_credits: '基础积分',
    pricing_bonus_credits: '赠送积分',
    pricing_total_credits: '合计积分',
    pricing_valid_forever: '积分永久有效',
    pricing_buy_now: '立即购买',
    pricing_validity_days: '有效期 {0} 天',
    pricing_max_members: '最多 {0} 人共享',
    pricing_discount: '模型使用折扣 + 优先生成队列',
    pricing_pay_method: '支付方式',
    pricing_wechat_pay: '微信支付',
    pricing_alipay: '支付宝',
    pricing_confirm_pay: '确认支付',
    pricing_secure_pay: '支付安全保障',
    pricing_select_method: '选择支付方式',
    pricing_current_credits: '当前积分：',
    agent_rebate: '订单返点比例',
    agent_fee: '一次性代理费',
    agent_apply_now: '立即申请',
    agent_current_level: '当前等级',
    agent_upgrade: '升级到此等级',
    agent_how_it_works: '申请流程',
    agent_step1_title: '选择代理等级',
    agent_step1_desc: '根据自身资源选择',
    agent_step2_title: '缴纳代理费',
    agent_step2_desc: '完成代理费支付',
    agent_step3_title: '获取推广链接',
    agent_step3_desc: '获取专属推广链接',
    agent_step4_title: '推广赚返点',
    agent_step4_desc: '用户充值自动返点',
    agent_apply_title: '申请代理',
    agent_contact: '联系方式 (微信/手机号)',
    agent_reason: '申请理由与推广资源',
    agent_submit: '提交申请',
    agent_cancel: '取消',
    promo_code_label: '推广码（选填）',
    promo_code_placeholder: '请输入推广码',
    pkg_starter: '入门包',
    pkg_basic: '基础包',
    pkg_advanced: '进阶包',
    pkg_pro: '专业包',
    pkg_ent_basic: '企业基础版',
    pkg_ent_std: '企业标准版',
    pkg_ent_pro: '企业专业版',
    pkg_ent_flagship: '企业旗舰版',
    agent_upgrade_cond: '升级条件：',
    agent_goto_promote: '进入推广后台',
    agent_upgrade_to_agent1: '升级为一级代理',
    agent_surpassed: '已超越此级别',
    agent_est_revenue: '💰 月收益预估',
    agent_est_revenue_desc: '收益示例',
    agent_promote_users: '推广{users}人，人均充值¥{avg}',
    agent_avg_recharge: '人均充值¥',
    agent_est_revenue_note: '* 仅供参考，实际收益与推广力度相关',
    agent_feature_1_title: '平台背书',
    agent_feature_1_desc: '正规运营平台，合法合规，放心推广',
    agent_feature_2_title: '实时到账',
    agent_feature_2_desc: '用户充值后返点自动计入代理账户',
    agent_feature_3_title: '持续增长',
    agent_feature_3_desc: 'AI漫剧市场持续爆发，先入场先占位',
    agent_feature_4_title: '推广素材',
    agent_feature_4_desc: '提供海报、视频、话术等一站式推广素材',
    agent_feature_5_title: '专属链接',
    agent_feature_5_desc: '一键生成专属推广链接，精准追踪转化',
    agent_feature_6_title: '专属客服',
    agent_feature_6_desc: '代理商专属对接经理，快速响应解答',
    agent_upgrade_prefix: '升级',
    agent_apply_prefix: '申请',
    agent_upgrade_pay: '补差价 ¥{fee} 升级',
    agent_apply_pay: '缴纳 ¥{fee} 申请',
    agent_submitting: '提交中...',
    agent_level1_name: '一级代理',
    agent_level1_desc: '适合MCN机构、内容平台、渠道商深度合作',
    agent_level1_cond: '顶级代理，享受最高权益',
    agent_level2_name: '二级代理',
    agent_level2_desc: '适合个人创作者、自媒体博主入门推广',
    agent_level2_cond: '推广满50人或累计成交满5000元可升级一级代理',
    agent_b_exclusive_link: '专属推广链接',
    agent_b_15_rebate: '15%订单返点',
    agent_b_regional: '独家区域授权',
    agent_b_priority_cs: '优先客服支持',
    agent_b_weekly_settle: '周结算周期',
    agent_b_custom_materials: '推广素材定制',
    agent_b_exclusive_manager: '专属对接经理',
    agent_b_8_rebate: '8%订单返点',
    agent_b_official_materials: '官方推广素材',
    agent_b_group_support: '代理群支持',
    agent_b_monthly_settle: '月结算周期',
    footer_desc: '专业AI驱动的漫剧与短剧制作平台，让每个故事都能生动呈现。',
    footer_product: '产品功能',
    footer_resources: '资源中心',
    footer_company: '关于我们',
    footer_legal: '法律条款',
    footer_contact: '联系我们',
    footer_email: '支持邮箱',
    footer_wechat: '微信客服',
  },
  en: {
    nav_novel: 'Novel to Comic',
    nav_video: 'Video to Anime',
    nav_ad: 'Ad Maker',
    nav_t2i: 'Text to Image',
    nav_i2v: 'Image to Video',
    nav_motion: 'Motion Transfer',
    nav_top_creation: 'Creation',
    nav_top_showcase: 'Showcase',
    nav_top_trending: 'Trending',
    nav_top_analysis: 'Analysis',
    nav_top_characters: 'Characters',
    nav_top_pricing: 'Pricing',
    nav_top_agent: 'Agent',
    hero_badge: 'New Era of AI Comic · 2026',
    hero_title_1: 'Make Every Story',
    hero_title_2: 'Become a Comic',
    hero_desc_1: 'Pro AI-driven comic production platform · 1-click video generation from novels',
    hero_desc_2: 'Smart video to anime conversion · 3 min output · Fully compliant',
    hero_desc_mobile: 'Pro AI Driven · Novel to Comic · Video to Anime<br />3 Min Output · Compliant',
    btn_start: 'Start Creating',
    btn_demo: 'Watch Demo',
    feat_title: 'Core Features',
    feat_subtitle: 'Discover how our AI comic platform empowers you',
    feat_1_title: 'Novel to Comic',
    feat_1_desc: 'Input text, AI auto-splits scenes, draws panels, and synthesizes dynamic video.',
    feat_2_title: 'Video to Anime',
    feat_2_desc: 'Upload live-action video, 1-click anime style transfer, auto-edit + subtitles.',
    feat_3_title: 'Smart Character Library',
    feat_3_desc: 'Maintain character consistency, custom avatars, seamless serialization.',
    feat_4_title: 'Multi-style Rendering',
    feat_4_desc: 'Anime, Manga, Western comic styles for diverse creative needs.',
    feat_5_title: 'Fast Rendering',
    feat_5_desc: 'Powerful cloud rendering reduces production time from days to minutes.',
    feat_6_title: 'Commercial Compliance',
    feat_6_desc: 'All assets are commercially usable with copyright protection.',
    showcase_title: 'Featured Showcases',
    showcase_subtitle: 'Explore our creator community for inspiration',
    characters_title: 'My Characters',
    characters_desc: 'Manage and create your custom comic characters',
    pricing_title: 'Flexible Pricing',
    pricing_desc: 'Buy credits to unlock all AI features, no hidden fees',
    agent_title: 'Become an Agent',
    agent_desc: 'Promote our platform and earn high commissions',
    analysis_title: 'Viral Analysis',
    analysis_desc: 'Multi-dimensional analysis of popular dramas for inspiration',
    trending_title: 'Creation Trending',
    trending_desc: 'Real-time global trends to spot the next big hit',
    novel_comic_title: 'Novel to Comic',
    novel_comic_desc: 'Input text, AI automatically creates scenes, voiceovers, and subtitles',
    video_anime_title: 'Video to Anime',
    video_anime_desc: 'Upload a short drama and convert it to anime style with one click',
    login_title: 'Welcome Back',
    login_desc: 'Log in to continue your AI creation journey',
    phone_label: 'Phone',
    phone_placeholder: 'Enter phone number',
    password_label: 'Password',
    password_placeholder: 'Enter password',
    btn_login: 'Log In',
    no_account: 'No account yet?',
    register_now: 'Register Now',
    register_title: 'Create Account',
    register_desc: 'Join us to start your AI comic creation journey',
    confirm_password: 'Confirm Password',
    confirm_placeholder: 'Enter password again',
    agree_terms: 'I have read and agree to the',
    user_agreement: 'User Agreement',
    privacy_policy: 'Privacy Policy',
    already_have_account: 'Already have an account?',
    login_now: 'Log In Now',
    country_86: 'China',
    country_1: 'US/CA',
    country_81: 'Japan',
    country_82: 'South Korea',
    country_44: 'UK',
    country_66: 'Thailand',
    country_852: 'Hong Kong',
    country_886: 'Taiwan',
    country_853: 'Macau',
    pricing_personal: 'Personal',
    pricing_enterprise: 'Enterprise',
    pricing_recommended: 'Recommended',
    pricing_popular: 'Most Popular',
    pricing_base_credits: 'Base Credits',
    pricing_bonus_credits: 'Bonus Credits',
    pricing_total_credits: 'Total Credits',
    pricing_valid_forever: 'Credits valid forever',
    pricing_buy_now: 'Buy Now',
    pricing_validity_days: 'Valid for {0} days',
    pricing_max_members: 'Up to {0} members',
    pricing_discount: 'Model discount + Priority queue',
    pricing_pay_method: 'Payment Method',
    pricing_wechat_pay: 'WeChat Pay',
    pricing_alipay: 'Alipay',
    pricing_confirm_pay: 'Confirm Payment',
    pricing_secure_pay: 'Secure Payment',
    pricing_select_method: 'Select Payment Method',
    pricing_current_credits: 'Current Credits: ',
    agent_rebate: 'Order Rebate',
    agent_fee: 'One-time Fee',
    agent_apply_now: 'Apply Now',
    agent_current_level: 'Current Level',
    agent_upgrade: 'Upgrade to this level',
    agent_how_it_works: 'How it works',
    agent_step1_title: 'Select Level',
    agent_step1_desc: 'Choose based on your resources',
    agent_step2_title: 'Pay the Fee',
    agent_step2_desc: 'Complete the payment',
    agent_step3_title: 'Get Affiliate Link',
    agent_step3_desc: 'Get your exclusive link',
    agent_step4_title: 'Earn Rebates',
    agent_step4_desc: 'Earn when users recharge',
    agent_apply_title: 'Apply for Agent',
    agent_contact: 'Contact Info (WeChat/Phone)',
    agent_reason: 'Reason & Resources',
    agent_submit: 'Submit Application',
    agent_cancel: 'Cancel',
    promo_code_label: 'Promo Code (Optional)',
    promo_code_placeholder: 'Enter promo code',
    pkg_starter: 'Starter Pack',
    pkg_basic: 'Basic Pack',
    pkg_advanced: 'Advanced Pack',
    pkg_pro: 'Pro Pack',
    pkg_ent_basic: 'Enterprise Basic',
    pkg_ent_std: 'Enterprise Standard',
    pkg_ent_pro: 'Enterprise Pro',
    pkg_ent_flagship: 'Enterprise Flagship',
    agent_upgrade_cond: 'Upgrade Condition: ',
    agent_goto_promote: 'Go to Promote Dashboard',
    agent_upgrade_to_agent1: 'Upgrade to Level 1 Agent',
    agent_surpassed: 'You have surpassed this level',
    agent_est_revenue: '💰 Estimated Monthly Revenue',
    agent_est_revenue_desc: 'Revenue Example',
    agent_promote_users: 'Promote {users} users, avg recharge ¥{avg}',
    agent_avg_recharge: 'Avg recharge ¥',
    agent_est_revenue_note: '* For reference only, actual revenue depends on your effort',
    agent_feature_1_title: 'Platform Endorsement',
    agent_feature_1_desc: 'Legitimate platform, operate with confidence',
    agent_feature_2_title: 'Real-time Settlement',
    agent_feature_2_desc: 'Rebates automatically added to your account',
    agent_feature_3_title: 'Continuous Growth',
    agent_feature_3_desc: 'AI comic market is booming',
    agent_feature_4_title: 'Marketing Materials',
    agent_feature_4_desc: 'One-stop materials including posters and videos',
    agent_feature_5_title: 'Exclusive Links',
    agent_feature_5_desc: '1-click exclusive link for accurate tracking',
    agent_feature_6_title: 'Exclusive Service',
    agent_feature_6_desc: 'Dedicated manager for fast response',
    agent_upgrade_prefix: 'Upgrade to',
    agent_apply_prefix: 'Apply for',
    agent_upgrade_pay: 'Pay difference ¥{fee} to upgrade',
    agent_apply_pay: 'Pay ¥{fee} to apply',
    agent_submitting: 'Submitting...',
    agent_level1_name: 'Level 1 Agent',
    agent_level1_desc: 'For MCN, platforms, and channel partners',
    agent_level1_cond: 'Top agent, highest privileges',
    agent_level2_name: 'Level 2 Agent',
    agent_level2_desc: 'For personal creators and influencers',
    agent_level2_cond: 'Promote 50 users or 5000 CNY sales to upgrade',
    agent_b_exclusive_link: 'Exclusive promo link',
    agent_b_15_rebate: '15% order rebate',
    agent_b_regional: 'Exclusive regional authorization',
    agent_b_priority_cs: 'Priority customer service',
    agent_b_weekly_settle: 'Weekly settlement',
    agent_b_custom_materials: 'Custom marketing materials',
    agent_b_exclusive_manager: 'Dedicated manager',
    agent_b_8_rebate: '8% order rebate',
    agent_b_official_materials: 'Official marketing materials',
    agent_b_group_support: 'Agent group support',
    agent_b_monthly_settle: 'Monthly settlement',
    footer_desc: 'Professional AI-driven platform for comic and anime creation. Make every story come alive.',
    footer_product: 'Product',
    footer_resources: 'Resources',
    footer_company: 'Company',
    footer_legal: 'Legal',
    footer_contact: 'Contact Us',
    footer_email: 'Support Email',
    footer_wechat: 'WeChat Support',
  },
  th: {
    nav_novel: 'นิยายเป็นคอมมิค',
    nav_video: 'วิดีโอเป็นอนิเมะ',
    nav_ad: 'สร้างโฆษณา',
    nav_t2i: 'ข้อความเป็นภาพ',
    nav_i2v: 'ภาพเป็นวิดีโอ',
    nav_motion: 'ถ่ายโอนการเคลื่อนไหว',
    nav_top_creation: 'ศูนย์กลางการสร้าง',
    nav_top_showcase: 'ผลงาน',
    nav_top_trending: 'ยอดนิยม',
    nav_top_analysis: 'วิเคราะห์',
    nav_top_characters: 'ตัวละคร',
    nav_top_pricing: 'เติมเงิน',
    nav_top_agent: 'ตัวแทน',
    hero_badge: 'ยุคใหม่ของคอมมิค AI · 2026',
    hero_title_1: 'เปลี่ยนทุกเรื่องราว',
    hero_title_2: 'ให้เป็นคอมมิค',
    hero_desc_1: 'แพลตฟอร์มสร้างคอมมิค AI มืออาชีพ · เปลี่ยนนิยายเป็นวิดีโอในคลิกเดียว',
    hero_desc_2: "วิดีโอจริงเป็นอนิเมะอัจฉริยะ · สร้างวิดีโอใน 3 นาที · ถูกลิขสิทธิ์",
    hero_desc_mobile: "AI ระดับโปร · นิยายเป็นคอมมิค · วิดีโอเป็นอนิเมะ<br />เสร็จใน 3 นาที · ถูกลิขสิทธิ์",
    btn_start: 'เริ่มสร้าง',
    btn_demo: 'ดูตัวอย่าง',
    feat_title: 'ฟีเจอร์หลัก',
    feat_subtitle: 'ค้นพบว่าแพลตฟอร์ม AI คอมมิคของเราช่วยคุณได้อย่างไร',
    feat_1_title: 'นิยายเป็นคอมมิค',
    feat_1_desc: 'ป้อนข้อความ AI จะแบ่งฉากวาดภาพและสร้างวิดีโอคอมมิคแบบไดนามิกโดยอัตโนมัติ',
    feat_2_title: 'วิดีโอเป็นอนิเมะ',
    feat_2_desc: 'อัปโหลดวิดีโอสั้นและเปลี่ยนเป็นสไตล์อนิเมะในคลิกเดียว ตัดต่ออัตโนมัติ+สร้างคำบรรยาย',
    feat_3_title: 'คลังตัวละครอัจฉริยะ',
    feat_3_desc: 'รักษาความสม่ำเสมอของตัวละคร ปรับแต่งรูปแทนตัว ซีเรียลไลซ์แบบไร้รอยต่อ',
    feat_4_title: 'เรนเดอร์หลายสไตล์',
    feat_4_desc: 'สไตล์อนิเมะ มังงะ คอมมิคตะวันตก เพื่อตอบสนองความต้องการที่หลากหลาย',
    feat_5_title: 'เรนเดอร์รวดเร็ว',
    feat_5_desc: 'เครื่องมือเรนเดอร์คลาวด์ทรงพลัง ลดเวลาการผลิตจากหลายวันเหลือเพียงไม่กี่นาที',
    feat_6_title: 'สอดคล้องเชิงพาณิชย์',
    feat_6_desc: 'สินทรัพย์ทั้งหมดใช้งานเชิงพาณิชย์ได้ พร้อมการปกป้องลิขสิทธิ์',
    showcase_title: 'ผลงานเด่น',
    showcase_subtitle: 'สำรวจชุมชนครีเอเตอร์ของเราเพื่อรับแรงบันดาลใจ',
    characters_title: 'ตัวละครของฉัน',
    characters_desc: 'จัดการและสร้างตัวละครการ์ตูนของคุณเอง',
    pricing_title: 'ราคายืดหยุ่น',
    pricing_desc: 'ซื้อเครดิตเพื่อปลดล็อกฟีเจอร์ AI ทั้งหมด ไม่มีค่าธรรมเนียมแอบแฝง',
    agent_title: 'เป็นตัวแทน',
    agent_desc: 'โปรโมตแพลตฟอร์มของเราและรับค่าคอมมิชชั่นสูง',
    analysis_title: 'วิเคราะห์ไวรัล',
    analysis_desc: 'วิเคราะห์ละครยอดนิยมหลายมิติเพื่อแรงบันดาลใจ',
    trending_title: 'เทรนด์การสร้าง',
    trending_desc: 'เทรนด์ทั่วโลกแบบเรียลไทม์เพื่อค้นหาฮิตครั้งต่อไป',
    novel_comic_title: 'นิยายเป็นการ์ตูน',
    novel_comic_desc: 'ป้อนข้อความ AI จะสร้างฉาก เสียงพากย์ และคำบรรยายให้โดยอัตโนมัติ',
    video_anime_title: 'วิดีโอเป็นอนิเมะ',
    video_anime_desc: 'อัปโหลดวิดีโอสั้นและแปลงเป็นสไตล์อนิเมะในคลิกเดียว',
    login_title: 'ยินดีต้อนรับกลับ',
    login_desc: 'เข้าสู่ระบบเพื่อดำเนินการสร้าง AI ของคุณต่อ',
    phone_label: 'เบอร์โทรศัพท์',
    phone_placeholder: 'ป้อนเบอร์โทรศัพท์',
    password_label: 'รหัสผ่าน',
    password_placeholder: 'ป้อนรหัสผ่าน',
    btn_login: 'เข้าสู่ระบบ',
    no_account: 'ยังไม่มีบัญชี?',
    register_now: 'สมัครเลย',
    register_title: 'สร้างบัญชี',
    register_desc: 'เข้าร่วมกับเราเพื่อเริ่มเส้นทางการสร้างการ์ตูน AI',
    confirm_password: 'ยืนยันรหัสผ่าน',
    confirm_placeholder: 'ป้อนรหัสผ่านอีกครั้ง',
    agree_terms: 'ฉันได้อ่านและยอมรับ',
    user_agreement: 'ข้อตกลงผู้ใช้',
    privacy_policy: 'นโยบายความเป็นส่วนตัว',
    already_have_account: 'มีบัญชีแล้ว?',
    login_now: 'เข้าสู่ระบบเลย',
    country_86: 'จีน',
    country_1: 'สหรัฐฯ/แคนาดา',
    country_81: 'ญี่ปุ่น',
    country_82: 'เกาหลีใต้',
    country_44: 'สหราชอาณาจักร',
    country_66: 'ไทย',
    country_852: 'ฮ่องกง',
    country_886: 'ไต้หวัน',
    country_853: 'มาเก๊า',
    pricing_personal: 'ส่วนบุคคล',
    pricing_enterprise: 'องค์กร',
    pricing_recommended: 'แนะนำ',
    pricing_popular: 'ยอดนิยม',
    pricing_base_credits: 'เครดิตพื้นฐาน',
    pricing_bonus_credits: 'เครดิตโบนัส',
    pricing_total_credits: 'เครดิตรวม',
    pricing_valid_forever: 'เครดิตไม่มีวันหมดอายุ',
    pricing_buy_now: 'ซื้อเลย',
    pricing_validity_days: 'มีอายุ {0} วัน',
    pricing_max_members: 'แชร์สูงสุด {0} คน',
    pricing_discount: 'ส่วนลดโมเดล + คิวสร้างล่วงหน้า',
    pricing_pay_method: 'วิธีชำระเงิน',
    pricing_wechat_pay: 'WeChat Pay',
    pricing_alipay: 'Alipay',
    pricing_confirm_pay: 'ยืนยันการชำระเงิน',
    pricing_secure_pay: 'การชำระเงินที่ปลอดภัย',
    pricing_select_method: 'เลือกวิธีชำระเงิน',
    pricing_current_credits: 'เครดิตปัจจุบัน: ',
    agent_rebate: 'เงินคืนจากคำสั่งซื้อ',
    agent_fee: 'ค่าธรรมเนียมครั้งเดียว',
    agent_apply_now: 'สมัครเลย',
    agent_current_level: 'ระดับปัจจุบัน',
    agent_upgrade: 'อัปเกรดเป็นระดับนี้',
    agent_how_it_works: 'วิธีการทำงาน',
    agent_step1_title: 'เลือกระดับ',
    agent_step1_desc: 'เลือกตามทรัพยากรของคุณ',
    agent_step2_title: 'ชำระค่าธรรมเนียม',
    agent_step2_desc: 'เสร็จสิ้นการชำระเงิน',
    agent_step3_title: 'รับลิงก์พันธมิตร',
    agent_step3_desc: 'รับลิงก์พิเศษของคุณ',
    agent_step4_title: 'รับเงินคืน',
    agent_step4_desc: 'รับเงินคืนเมื่อผู้ใช้เติมเงิน',
    agent_apply_title: 'สมัครเป็นตัวแทน',
    agent_contact: 'ข้อมูลการติดต่อ (WeChat/โทรศัพท์)',
    agent_reason: 'เหตุผลและทรัพยากร',
    agent_submit: 'ส่งใบสมัคร',
    agent_cancel: 'ยกเลิก',
    promo_code_label: 'รหัสอ้างอิง (ไม่บังคับ)',
    promo_code_placeholder: 'ป้อนรหัสอ้างอิง',
    pkg_starter: 'แพ็กเกจเริ่มต้น',
    pkg_basic: 'แพ็กเกจพื้นฐาน',
    pkg_advanced: 'แพ็กเกจขั้นสูง',
    pkg_pro: 'แพ็กเกจโปร',
    pkg_ent_basic: 'ระดับองค์กรเบื้องต้น',
    pkg_ent_std: 'ระดับองค์กรมาตรฐาน',
    pkg_ent_pro: 'ระดับองค์กรมืออาชีพ',
    pkg_ent_flagship: 'ระดับองค์กรเรือธง',
    agent_upgrade_cond: 'เงื่อนไขการอัปเกรด: ',
    agent_goto_promote: 'ไปที่หน้าส่งเสริมการขาย',
    agent_upgrade_to_agent1: 'อัปเกรดเป็นตัวแทนระดับ 1',
    agent_surpassed: 'คุณเกินระดับนี้แล้ว',
    agent_est_revenue: '💰 รายได้ต่อเดือนโดยประมาณ',
    agent_est_revenue_desc: 'ตัวอย่างรายได้',
    agent_promote_users: 'เชิญผู้ใช้ {users} คน เติมเงินเฉลี่ย ¥{avg}',
    agent_avg_recharge: 'เติมเงินเฉลี่ย ¥',
    agent_est_revenue_note: '* สำหรับอ้างอิงเท่านั้น รายได้จริงขึ้นอยู่กับความพยายามของคุณ',
    agent_feature_1_title: 'การรับรองจากแพลตฟอร์ม',
    agent_feature_1_desc: 'แพลตฟอร์มที่ถูกกฎหมาย ดำเนินงานอย่างมั่นใจ',
    agent_feature_2_title: 'การชำระเงินตามเวลาจริง',
    agent_feature_2_desc: 'เงินคืนจะเข้าบัญชีตัวแทนของคุณโดยอัตโนมัติ',
    agent_feature_3_title: 'การเติบโตอย่างต่อเนื่อง',
    agent_feature_3_desc: 'ตลาดอนิเมะ AI กำลังเฟื่องฟู',
    agent_feature_4_title: 'สื่อการตลาด',
    agent_feature_4_desc: 'สื่อการตลาดแบบครบวงจร รวมถึงโปสเตอร์และวิดีโอ',
    agent_feature_5_title: 'ลิงก์สุดพิเศษ',
    agent_feature_5_desc: 'ลิงก์โปรโมตเฉพาะคลิกเดียว ติดตามแม่นยำ',
    agent_feature_6_title: 'บริการพิเศษ',
    agent_feature_6_desc: 'ผู้จัดการเฉพาะสำหรับการตอบกลับอย่างรวดเร็ว',
    agent_upgrade_prefix: 'อัปเกรด',
    agent_apply_prefix: 'สมัคร',
    agent_upgrade_pay: 'ชำระส่วนต่าง ¥{fee} เพื่ออัปเกรด',
    agent_apply_pay: 'ชำระ ¥{fee} เพื่อสมัคร',
    agent_submitting: 'กำลังส่ง...',
    agent_level1_name: 'ตัวแทนระดับ 1',
    agent_level1_desc: 'สำหรับ MCN แพลตฟอร์ม และพันธมิตรช่องทาง',
    agent_level1_cond: 'ตัวแทนระดับสูงสุด สิทธิพิเศษสูงสุด',
    agent_level2_name: 'ตัวแทนระดับ 2',
    agent_level2_desc: 'สำหรับผู้สร้างส่วนตัวและบล็อกเกอร์',
    agent_level2_cond: 'เชิญ 50 คน หรือ ยอดขาย 5000 หยวน เพื่ออัปเกรด',
    agent_b_exclusive_link: 'ลิงก์โปรโมตสุดพิเศษ',
    agent_b_15_rebate: 'เงินคืนจากคำสั่งซื้อ 15%',
    agent_b_regional: 'สิทธิ์ในพื้นที่เฉพาะ',
    agent_b_priority_cs: 'การบริการลูกค้าที่มีลำดับความสำคัญ',
    agent_b_weekly_settle: 'การชำระเงินรายสัปดาห์',
    agent_b_custom_materials: 'สื่อการตลาดที่ปรับแต่งได้',
    agent_b_exclusive_manager: 'ผู้จัดการส่วนตัว',
    agent_b_8_rebate: 'เงินคืนจากคำสั่งซื้อ 8%',
    agent_b_official_materials: 'สื่อการตลาดอย่างเป็นทางการ',
    agent_b_group_support: 'การสนับสนุนกลุ่มตัวแทน',
    agent_b_monthly_settle: 'การชำระเงินรายเดือน',
    footer_desc: 'แพลตฟอร์มที่ขับเคลื่อนด้วย AI สำหรับสร้างคอมมิคและวิดีโอ',
    footer_product: 'ฟีเจอร์',
    footer_resources: 'ทรัพยากร',
    footer_company: 'บริษัท',
    footer_legal: 'กฎหมาย',
    footer_contact: 'ติดต่อเรา',
    footer_email: 'อีเมลสนับสนุน',
    footer_wechat: 'WeChat ฝ่ายสนับสนุน',
  },
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    if (saved === 'zh' || saved === 'en' || saved === 'th') {
      return saved as Language;
    }
    return 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: TranslationKey) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
