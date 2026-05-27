UPDATE public.credit_packages SET validity_days = 30 WHERE name = '入门包' AND is_enterprise = false;
UPDATE public.credit_packages SET validity_days = 60 WHERE name = '基础包' AND is_enterprise = false;
UPDATE public.credit_packages SET validity_days = 90 WHERE name = '进阶包' AND is_enterprise = false;
UPDATE public.credit_packages SET validity_days = 180 WHERE name = '专业包' AND is_enterprise = false;

UPDATE public.credit_packages SET validity_days = 365 WHERE is_enterprise = true;