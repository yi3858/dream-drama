import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTEGRATIONS_API_KEY = Deno.env.get('INTEGRATIONS_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const WENXIN_URL = 'https://app-brhf2ms7ez29-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions';
const IMG_SUBMIT_URL = 'https://app-brhf2ms7ez29-api-ra5EZDjVKkXa-gateway.appmiaoda.com/image-generation/submit';
const IMG_QUERY_URL = 'https://app-brhf2ms7ez29-api-VaOwP2jDmAga-gateway.appmiaoda.com/image-generation/task';

const BUCKET = 'character-assets';

// ── 文心一言生成角色文字信息 ────────────────────────────
async function generateCharacterInfo(keyword: string): Promise<{
  name: string; description: string; tags: string[];
}> {
  const prompt = `你是一个动漫角色设计师。根据关键词"${keyword}"，生成一个动漫角色的信息。
请严格按照以下 JSON 格式返回，不要包含任何其他内容：
{
  "name": "角色名称（中文，2-6字）",
  "description": "角色描述（100-150字，包含外貌特征、性格特点、服装风格等）",
  "tags": ["标签1", "标签2", "标签3"]
}
标签要求：3-5个，每个2-5字，描述角色特征。`;

  const res = await fetch(WENXIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${INTEGRATIONS_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'ernie-4.5-turbo-128k',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`文心 API 错误: ${res.status}`);
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? json?.result ?? '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('文心返回格式异常');
  const parsed = JSON.parse(match[0]);
  return {
    name: parsed.name ?? keyword,
    description: parsed.description ?? '',
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
  };
}

// ── AI 生成头像（支持文生图 & 图生图） ───────────────────
async function generateAvatar(
  name: string,
  description: string,
  referenceImageBase64?: string,  // 参考图 base64（不含 data: 前缀）
  referenceImageMime?: string,    // 如 image/jpeg
): Promise<string | null> {
  const prompt = `动漫风格角色头像，${name}，${description.slice(0, 80)}，高清，正脸，居中构图，白色背景，精美插画风格`;

  // 构建 contents：有参考图时用图生图模式
  type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
  const parts: Part[] = [{ text: prompt }];
  if (referenceImageBase64 && referenceImageMime) {
    parts.push({
      inline_data: {
        mime_type: referenceImageMime,
        data: referenceImageBase64,
      },
    });
  }

  // 提交任务
  const submitRes = await fetch(IMG_SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${INTEGRATIONS_API_KEY}`,
    },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!submitRes.ok) return null;
  const submitJson = await submitRes.json();
  if (submitJson.status !== 0) return null;
  const taskId: string = submitJson.data.taskId;

  // 轮询最多 90 秒
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 6000));
    const queryRes = await fetch(IMG_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${INTEGRATIONS_API_KEY}`,
      },
      body: JSON.stringify({ taskId }),
    });
    if (!queryRes.ok) continue;
    const queryJson = await queryRes.json();
    if (queryJson.status !== 0) continue;
    const status: string = queryJson.data.status;
    if (status === 'SUCCESS') {
      const imageUrl: string = queryJson.data.result?.imageUrl;
      if (!imageUrl) return null;
      return await transferToStorage(imageUrl);
    }
    if (status === 'FAILED') return null;
  }
  return null;
}

// ── 将远端图片转存到 Storage ─────────────────────────────
async function transferToStorage(imageUrl: string): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl);
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const filePath = `ai-generated/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, imgRes.body!, { contentType, duplex: 'half' });
    if (error) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ── 主处理函数 ──────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const {
      keyword,
      includeAvatar = true,
      referenceImageBase64,
      referenceImageMime,
    } = await req.json();

    if (!keyword?.trim()) {
      return new Response(JSON.stringify({ error: '请提供角色关键词' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // 先生成文字信息，再并行生成头像
    const info = await generateCharacterInfo(keyword.trim());

    const avatarUrl = includeAvatar
      ? await generateAvatar(
          info.name,
          info.description,
          referenceImageBase64,
          referenceImageMime,
        ).catch(() => null)
      : null;

    return new Response(JSON.stringify({
      name: info.name,
      description: info.description,
      tags: info.tags,
      avatar_url: avatarUrl,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-character error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
