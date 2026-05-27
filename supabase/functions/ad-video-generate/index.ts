import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RUNNINGHUB_BASE = 'https://www.runninghub.cn';
const API_KEY = Deno.env.get('RUNNINGHUB_API_KEY') ?? '';

// RunningHub sparkvideo-2.0-fast workflow ID（广告专用）
const WORKFLOW_ID = 'sparkvideo-2.0-fast';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: '身份验证失败' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── 提交生成任务 ──────────────────────────────────────
    if (action === 'submit') {
      const {
        prompt, adType, style, resolution, duration,
        realPersonMode = false,
        productImageUrls = [],
        logoUrl = null,
        bgmUrl = null,
      } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: '提示词不能为空' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 构建 RunningHub 节点参数
      const nodeInfoList = [
        { nodeId: 'prompt', fieldName: 'text', fieldValue: buildFullPrompt(prompt, adType, style, realPersonMode) },
        { nodeId: 'resolution', fieldName: 'value', fieldValue: mapResolution(resolution) },
        { nodeId: 'duration', fieldName: 'value', fieldValue: String(duration) },
      ];

      if (productImageUrls.length > 0) {
        nodeInfoList.push({ nodeId: 'product_image', fieldName: 'image_url', fieldValue: productImageUrls[0] });
      }
      if (logoUrl) {
        nodeInfoList.push({ nodeId: 'logo', fieldName: 'image_url', fieldValue: logoUrl });
      }
      if (bgmUrl) {
        nodeInfoList.push({ nodeId: 'bgm', fieldName: 'audio_url', fieldValue: bgmUrl });
      }

      const submitRes = await fetch(`${RUNNINGHUB_BASE}/task/openapi/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: API_KEY,
          workflowId: WORKFLOW_ID,
          nodeInfoList,
        }),
      });

      const submitJson = await submitRes.json();

      if (submitJson.code !== 0) {
        console.error('RunningHub submit error:', submitJson);
        return new Response(JSON.stringify({ error: submitJson.msg ?? '提交失败' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const taskId = submitJson.data?.taskId ?? submitJson.data?.task_id;
      return new Response(JSON.stringify({ taskId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 查询任务状态 ──────────────────────────────────────
    if (action === 'status') {
      const { taskId } = body;
      if (!taskId) {
        return new Response(JSON.stringify({ error: 'taskId 不能为空' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const statusRes = await fetch(`${RUNNINGHUB_BASE}/task/openapi/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY, taskId }),
      });

      const statusJson = await statusRes.json();

      if (statusJson.code !== 0) {
        return new Response(JSON.stringify({ error: statusJson.msg ?? '查询失败' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const taskStatus = statusJson.data?.taskStatus ?? statusJson.data?.status;
      const progress = statusJson.data?.progress ?? 0;

      // 状态映射：RunningHub -> 前端
      // QUEUING / RUNNING / SUCCESS / FAILED / CANCELED
      return new Response(JSON.stringify({ taskStatus, progress, raw: statusJson.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 获取任务结果 ──────────────────────────────────────
    if (action === 'result') {
      const { taskId } = body;
      if (!taskId) {
        return new Response(JSON.stringify({ error: 'taskId 不能为空' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const resultRes = await fetch(`${RUNNINGHUB_BASE}/task/openapi/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY, taskId }),
      });

      const resultJson = await resultRes.json();

      if (resultJson.code !== 0) {
        return new Response(JSON.stringify({ error: resultJson.msg ?? '获取结果失败' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 找出视频输出 URL
      const outputs: Array<{ fileType: string; fileUrl: string }> = resultJson.data ?? [];
      const videoOutput = outputs.find(o =>
        o.fileType === 'VIDEO' || o.fileUrl?.endsWith('.mp4') || o.fileUrl?.includes('video')
      );

      return new Response(JSON.stringify({
        videoUrl: videoOutput?.fileUrl ?? null,
        outputs,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('ad-video-generate error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── 工具函数 ─────────────────────────────────────────────
function buildFullPrompt(
  userPrompt: string,
  adType: string,
  style: string,
  realPersonMode: boolean
): string {
  const styleMap: Record<string, string> = {
    cinematic: 'cinematic quality, film-like lighting, dramatic composition',
    luxury: 'high-end luxury aesthetics, premium feel, elegant details',
    business: 'clean minimalist business style, professional corporate look',
    chinese: 'Chinese traditional cultural elements, ink painting style, oriental aesthetics',
    cyberpunk: 'cyberpunk neon lights, futuristic dystopian atmosphere, vivid saturated colors',
    realistic: 'photorealistic, highly detailed, natural lighting',
  };

  const adTypeMap: Record<string, string> = {
    product: 'product advertisement video',
    brand: 'brand promotion film',
    ecommerce: 'e-commerce short video, product showcase',
    store: 'local store promotion video',
    holiday: 'festive holiday advertisement',
  };

  const parts = [
    adTypeMap[adType] ?? 'advertisement video',
    styleMap[style] ?? '',
    userPrompt,
    realPersonMode ? 'featuring real person presenter, natural human performance' : '',
    'high quality, commercial grade, 4K resolution',
  ].filter(Boolean);

  return parts.join(', ');
}

function mapResolution(resolution: string): string {
  const map: Record<string, string> = {
    '480p': '854x480',
    '720p': '1280x720',
    '1080p': '1920x1080',
  };
  return map[resolution.toLowerCase()] ?? '1280x720';
}
