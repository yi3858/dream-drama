import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RUNNINGHUB_BASE = 'https://www.runninghub.cn';
const API_KEY = Deno.env.get('RUNNINGHUB_API_KEY') ?? '';
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
        imageUrl,
        motionPrompt = '',
        motionStrength = 'medium', // light | medium | strong
        duration = 5,
        resolution = '720p',
        videoStyle = 'realistic',
      } = body;

      if (!imageUrl) {
        return new Response(JSON.stringify({ error: '参考图片不能为空' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const strengthMap: Record<string, string> = {
        light: '0.3', medium: '0.6', strong: '0.9',
      };
      const stylePromptMap: Record<string, string> = {
        realistic: 'photorealistic, natural motion, high quality',
        anime:     'anime style, smooth animation, vibrant colors',
        cinematic: 'cinematic motion, film grain, dramatic lighting',
      };

      const fullPrompt = [
        motionPrompt.trim(),
        stylePromptMap[videoStyle] ?? '',
        'smooth motion, high quality video',
      ].filter(Boolean).join(', ');

      const nodeInfoList = [
        { nodeId: 'input_image', fieldName: 'image_url', fieldValue: imageUrl },
        { nodeId: 'prompt', fieldName: 'text', fieldValue: fullPrompt },
        { nodeId: 'motion_strength', fieldName: 'value', fieldValue: strengthMap[motionStrength] ?? '0.6' },
        { nodeId: 'duration', fieldName: 'value', fieldValue: String(duration) },
        { nodeId: 'resolution', fieldName: 'value', fieldValue: mapResolution(resolution) },
        { nodeId: 'mode', fieldName: 'value', fieldValue: 'image_to_video' },
      ];

      const submitRes = await fetch(`${RUNNINGHUB_BASE}/task/openapi/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY, workflowId: WORKFLOW_ID, nodeInfoList }),
      });

      const submitJson = await submitRes.json();
      if (submitJson.code !== 0) {
        console.error('image-to-video submit error:', submitJson);
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
      const videoOutput = outputs.find(o =>
        o.fileType === 'VIDEO' || o.fileUrl?.endsWith('.mp4') || o.fileUrl?.includes('video')
      );

      return new Response(JSON.stringify({ videoUrl: videoOutput?.fileUrl ?? null, outputs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('image-to-video error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapResolution(resolution: string): string {
  const map: Record<string, string> = {
    '480p': '854x480',
    '720p': '1280x720',
    '1080p': '1920x1080',
  };
  return map[resolution.toLowerCase()] ?? '1280x720';
}
