import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 从平台环境变量读取 OpenClaw 配置
const OPENCLAW_API_KEY = Deno.env.get('OPENCLAW_API_KEY');
const OPENCLAW_BASE_URL = Deno.env.get('OPENCLAW_BASE_URL') ?? '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// ── 基础鉴权：确认请求携带有效 JWT ────────────────────
async function verifyUser(authHeader: string | null): Promise<{ id: string } | null> {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await client.auth.getUser();
  return user ? { id: user.id } : null;
}

// ── 主处理函数 ────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  // 检查密钥是否已配置
  if (!OPENCLAW_API_KEY) {
    return json({ error: 'OPENCLAW_API_KEY 未配置，请先在平台 Secret 管理中填写 OpenClaw API Key' }, 500);
  }

  try {
    // 基础鉴权：仅登录用户可操作
    const user = await verifyUser(req.headers.get('Authorization'));
    if (!user) return json({ error: '未登录，请先登录' }, 401);

    const {
      endpoint,
      method = 'POST',
      body,
      headers: extraHeaders = {},
    } = await req.json();

    if (!endpoint || typeof endpoint !== 'string') {
      return json({ error: '缺少 endpoint 参数（如 /v1/generate）' }, 400);
    }

    // 拼接目标 URL：优先使用环境变量中的 BASE_URL，否则使用 endpoint 作为完整地址
    const targetUrl = OPENCLAW_BASE_URL
      ? `${OPENCLAW_BASE_URL.replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
      : endpoint;

    // 转发请求到 OpenClaw
    const fetchRes = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // OpenClaw 常用认证方式：Bearer Token
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
        // 备选认证方式：x-api-key（如 OpenClaw 要求，可取消注释）
        // 'x-api-key': OPENCLAW_API_KEY,
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 读取响应
    let responseBody: unknown;
    const contentType = fetchRes.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      responseBody = await fetchRes.json();
    } else {
      responseBody = { raw: await fetchRes.text() };
    }

    console.log(`[openclaw-proxy] ${method} ${targetUrl} → ${fetchRes.status}`);

    return json({
      success: fetchRes.ok,
      status: fetchRes.status,
      data: responseBody,
    }, fetchRes.ok ? 200 : 502);

  } catch (err) {
    console.error('[openclaw-proxy] error:', err);
    return json({ error: (err as Error).message ?? '未知错误' }, 500);
  }
});
