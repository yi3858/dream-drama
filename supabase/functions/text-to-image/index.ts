import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RUNNINGHUB_BASE = 'https://www.runninghub.cn';
const API_KEY = Deno.env.get('RUNNINGHUB_API_KEY') ?? '';
const WORKFLOW_ID = 'text-to-image-fast'; // RunningHub 文生图工作流

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
        prompt, negativePrompt = '', style, ratio, count = 1, quality = 'standard',
      } = body;

      if (!prompt?.trim()) {
        return new Response(JSON.stringify({ error: '提示词不能为空' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fullPrompt = buildFullPrompt(prompt, style);
      const [width, height] = parseRatio(ratio);

      const nodeInfoList = [
        { nodeId: 'positive_prompt', fieldName: 'text', fieldValue: fullPrompt },
        { nodeId: 'negative_prompt', fieldName: 'text', fieldValue: negativePrompt || 'blurry, low quality, distorted, watermark' },
        { nodeId: 'width', fieldName: 'value', fieldValue: String(width) },
        { nodeId: 'height', fieldName: 'value', fieldValue: String(height) },
        { nodeId: 'batch_size', fieldName: 'value', fieldValue: String(count) },
        { nodeId: 'steps', fieldName: 'value', fieldValue: qualityToSteps(quality) },
      ];

      const submitRes = await fetch(`${RUNNINGHUB_BASE}/task/openapi/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY, workflowId: WORKFLOW_ID, nodeInfoList }),
      });

      const submitJson = await submitRes.json();
      if (submitJson.code !== 0) {
        console.error('text-to-image submit error:', submitJson);
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
      return new Response(JSON.stringify({ taskStatus, progress }), {
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

      const outputs: Array<{ fileType: string; fileUrl: string }> = resultJson.data ?? [];
      const imageUrls = outputs
        .filter(o => o.fileType === 'IMAGE' || o.fileUrl?.match(/\.(jpg|jpeg|png|webp)/i))
        .map(o => o.fileUrl);

      return new Response(JSON.stringify({ imageUrls }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('text-to-image error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── 工具函数 ─────────────────────────────────────────────
const STYLE_PROMPTS: Record<string, string> = {
  realistic:  'photorealistic, ultra-detailed, professional photography, 8k resolution, sharp focus',
  anime:      'anime style, vibrant colors, clean linework, manga aesthetics, 2D illustration',
  oilpainting:'oil painting style, thick brushstrokes, artistic texture, impressionist, warm palette',
  cyberpunk:  'cyberpunk aesthetic, neon lights, dark futuristic city, vivid saturated colors',
  chinese:    'Chinese ink painting, traditional brushwork, oriental aesthetics, misty mountains',
  '3d':       '3D render, octane render, subsurface scattering, volumetric lighting, cinema 4D',
  pixel:      'pixel art, retro game style, 16-bit, crisp pixels, vibrant colors',
  sketch:     'pencil sketch, black and white, detailed line art, monochrome illustration',
};

function buildFullPrompt(userPrompt: string, style: string): string {
  const styleTag = STYLE_PROMPTS[style] ?? '';
  return [userPrompt.trim(), styleTag, 'masterpiece, best quality'].filter(Boolean).join(', ');
}

function parseRatio(ratio: string): [number, number] {
  const map: Record<string, [number, number]> = {
    '1:1':  [1024, 1024],
    '4:3':  [1024, 768],
    '3:4':  [768, 1024],
    '16:9': [1280, 720],
    '9:16': [720, 1280],
  };
  return map[ratio] ?? [1024, 1024];
}

function qualityToSteps(quality: string): string {
  const map: Record<string, string> = {
    standard:    '20',
    fine:        '30',
    superfine:   '50',
  };
  return map[quality] ?? '20';
}
