import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTEGRATIONS_API_KEY  = Deno.env.get('INTEGRATIONS_API_KEY')!;
const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;

// 与 generate-character 相同的图片生成接口
const IMG_SUBMIT_URL = 'https://app-brhf2ms7ez29-api-ra5EZDjVKkXa-gateway.appmiaoda.com/image-generation/submit';
const IMG_QUERY_URL  = 'https://app-brhf2ms7ez29-api-VaOwP2jDmAga-gateway.appmiaoda.com/image-generation/task';

const BUCKET = 'style-assets';

// ── 管理员鉴权 ──────────────────────────────────────────
async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return false;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;

  // 查询 user_profiles.role = 'admin'
  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data } = await svc
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return data?.role === 'admin';
}

// ── 根据画风信息生成提示词 ────────────────────────────────
function buildPrompt(label: string, description: string, tags: string[]): string {
  const tagStr = tags.length > 0 ? tags.join('、') : '';
  return [
    `${label}风格插画，${description}`,
    tagStr ? `特征：${tagStr}` : '',
    '高质量、精细画面、16:9横版展示图，无文字水印，构图完整',
  ].filter(Boolean).join('，');
}

// ── 提交 AI 生成任务 ──────────────────────────────────────
async function submitGenTask(prompt: string): Promise<string | null> {
  const res = await fetch(IMG_SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${INTEGRATIONS_API_KEY}`,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 0) return null;
  return json.data?.taskId ?? null;
}

// ── 轮询任务结果（最多 120 秒）───────────────────────────
async function pollTask(taskId: string): Promise<string | null> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 6000));
    const res = await fetch(IMG_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${INTEGRATIONS_API_KEY}`,
      },
      body: JSON.stringify({ taskId }),
    });
    if (!res.ok) continue;
    const json = await res.json();
    if (json.status !== 0) continue;
    const status: string = json.data?.status;
    if (status === 'SUCCESS') {
      return json.data?.result?.imageUrl ?? null;
    }
    if (status === 'FAILED') return null;
  }
  return null;
}

// ── 将远端图片转存到 style-assets Storage ────────────────
async function transferToStorage(imageUrl: string, styleId: string): Promise<string | null> {
  const imgRes = await fetch(imageUrl);
  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
  if (!contentType.startsWith('image/')) return null;

  const svc      = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const filePath = `previews/${styleId}_ai_${Date.now()}.jpg`;

  const { error } = await svc.storage
    .from(BUCKET)
    .upload(filePath, imgRes.body!, { contentType, duplex: 'half' });
  if (error) {
    console.error('Storage upload error:', error.message);
    return null;
  }

  const { data } = svc.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

// ── 主处理函数 ──────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    // 鉴权：仅管理员可操作
    const isAdmin = await verifyAdmin(req.headers.get('Authorization'));
    if (!isAdmin) return json({ error: '无操作权限，仅管理员可使用此功能' }, 403);

    const { styleId, label, description, tags = [], customPrompt } = await req.json();

    if (!styleId || !label) {
      return json({ error: '缺少必要参数 styleId 或 label' }, 400);
    }

    // 优先使用管理员自定义提示词，否则自动构建
    const prompt = (typeof customPrompt === 'string' && customPrompt.trim())
      ? customPrompt.trim()
      : buildPrompt(
          label,
          description ?? '',
          Array.isArray(tags) ? tags : [],
        );
    console.log(`[generate-style-preview] styleId=${styleId}, prompt=${prompt.slice(0, 80)}`);

    // 提交图片生成任务
    const taskId = await submitGenTask(prompt);
    if (!taskId) return json({ error: 'AI 任务提交失败，请稍后重试' }, 500);

    // 等待生成完成
    const imageUrl = await pollTask(taskId);
    if (!imageUrl) return json({ error: 'AI 生成超时或失败，请重试' }, 500);

    // 转存到 Storage
    const publicUrl = await transferToStorage(imageUrl, styleId);
    if (!publicUrl) return json({ error: '图片保存失败，请重试' }, 500);

    // 更新 style_configs.preview_url
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: dbErr } = await svc
      .from('style_configs')
      .update({ preview_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', styleId);

    if (dbErr) return json({ error: '数据库更新失败：' + dbErr.message }, 500);

    console.log(`[generate-style-preview] SUCCESS styleId=${styleId} url=${publicUrl}`);
    return json({ success: true, previewUrl: publicUrl });

  } catch (err) {
    console.error('[generate-style-preview] error:', err);
    return json({ error: (err as Error).message ?? '未知错误' }, 500);
  }
});
