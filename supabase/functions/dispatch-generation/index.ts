/**
 * dispatch-generation — 统一 AI 生成任务网关
 *
 * 功能：
 *  1. 验证用户身份
 *  2. 从 model_channels 读取渠道配置（含加密密钥）
 *  3. 积分预检并冻结
 *  4. 路由到对应平台 (volc / aliyun / jimeng / runninghub / openai)
 *  5. 成功 → 确认扣积分 + 记录结果；失败 → 退还积分
 *  6. 支持 action: submit | status | result
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, okJson, errJson } from '../_shared/cors.ts';

const sb = () =>
  createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return errJson('未授权', 401);

  const supabase = sb();

  // 验证用户身份
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authErr || !user) return errJson('身份验证失败', 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errJson('请求体格式错误', 400); }

  const action = body.action as string;

  // ────────────── 提交生成任务 ──────────────
  if (action === 'submit') {
    return handleSubmit(supabase, user.id, body);
  }

  // ────────────── 查询任务状态 ──────────────
  if (action === 'status') {
    return handleStatus(supabase, user.id, body);
  }

  // ────────────── 获取任务结果 ──────────────
  if (action === 'result') {
    return handleResult(supabase, user.id, body);
  }

  return errJson('未知操作', 400);
});

// ═════════════════════════════════════════════════════════════════════════════
// submit
// ═════════════════════════════════════════════════════════════════════════════
async function handleSubmit(
  supabase: ReturnType<typeof sb>,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const {
    channel_id,
    prompt,
    feature_type = 'text_to_image',
    credits_override,
    params = {},
  } = body as {
    channel_id: string;
    prompt: string;
    feature_type?: string;
    credits_override?: number;
    params?: Record<string, unknown>;
  };

  if (!channel_id) return errJson('channel_id 不能为空', 400);
  if (!prompt?.trim()) return errJson('提示词不能为空', 400);

  // 1. 读取渠道配置
  const { data: channel, error: chErr } = await supabase
    .from('model_channels')
    .select('*, pricing:model_pricing(user_credits)')
    .eq('id', channel_id)
    .eq('enabled', true)
    .maybeSingle();

  if (chErr || !channel) return errJson('渠道不存在或已禁用', 404);

  // 2. 计算本次消耗积分
  const pricingRow = Array.isArray(channel.pricing) ? channel.pricing[0] : channel.pricing;
  const baseCredits: number = pricingRow?.user_credits ?? 10;
  const creditsNeeded = credits_override ?? baseCredits;

  // 3. 检查用户积分是否充足
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .maybeSingle();

  if (profErr || !profile) return errJson('获取用户信息失败', 500);
  if ((profile.credits ?? 0) < creditsNeeded) {
    return errJson(`积分不足，本次需消耗 ${creditsNeeded} 积分，当前余额 ${profile.credits ?? 0}`, 402);
  }

  // 4. 预扣积分（乐观锁）
  const { error: deductErr } = await supabase.rpc('fn_deduct_credits', {
    p_user_id: userId,
    p_amount: creditsNeeded,
    p_reason: `AI生成-${channel.name}`,
  });
  if (deductErr) return errJson(`积分扣除失败: ${deductErr.message}`, 500);

  // 5. 创建任务记录
  const { data: task, error: taskErr } = await supabase
    .from('generation_tasks')
    .insert({
      user_id: userId,
      channel_id,
      feature_type,
      status: 'processing',
      credits_charged: creditsNeeded,
      prompt: prompt.trim(),
      params,
    })
    .select('id')
    .single();

  if (taskErr || !task) {
    // 退还积分
    await refundCredits(supabase, userId, creditsNeeded, '生成任务创建失败-退还');
    return errJson('任务创建失败', 500);
  }

  const taskId = task.id;

  // 6. 路由到对应平台
  try {
    const externalTaskId = await dispatchToProvider(channel, prompt.trim(), params as Record<string, unknown>);

    // 记录外部任务ID
    await supabase
      .from('generation_tasks')
      .update({ external_task_id: externalTaskId, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    return okJson({ taskId, externalTaskId, creditsCharged: creditsNeeded });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[dispatch-generation] 平台调用失败 [${channel.provider_type}]:`, msg);

    // 退还积分 + 标记任务失败
    await Promise.all([
      refundCredits(supabase, userId, creditsNeeded, `API调用失败-退还`),
      supabase.from('generation_tasks').update({
        status: 'failed', error_msg: msg, updated_at: new Date().toISOString(),
      }).eq('id', taskId),
    ]);

    return errJson(`生成失败: ${msg}`, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// status
// ═════════════════════════════════════════════════════════════════════════════
async function handleStatus(
  supabase: ReturnType<typeof sb>,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const { taskId } = body as { taskId: string };
  if (!taskId) return errJson('taskId 不能为空', 400);

  // 先查本地任务记录
  const { data: task } = await supabase
    .from('generation_tasks')
    .select('*, channel:model_channels(provider_type,api_key,api_secret,endpoint)')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!task) return errJson('任务不存在', 404);
  if (task.status === 'completed') {
    return okJson({ status: 'completed', progress: 100, resultUrls: task.result_urls });
  }
  if (task.status === 'failed') {
    return okJson({ status: 'failed', errorMsg: task.error_msg });
  }

  // 向外部平台查询进度
  const channel = Array.isArray(task.channel) ? task.channel[0] : task.channel;
  if (!channel || !task.external_task_id) {
    return okJson({ status: task.status, progress: 0 });
  }

  try {
    const result = await queryProviderStatus(channel, task.external_task_id);
    return okJson(result);
  } catch (err) {
    return okJson({ status: 'processing', progress: 0, error: String(err) });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// result
// ═════════════════════════════════════════════════════════════════════════════
async function handleResult(
  supabase: ReturnType<typeof sb>,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const { taskId } = body as { taskId: string };
  if (!taskId) return errJson('taskId 不能为空', 400);

  const { data: task } = await supabase
    .from('generation_tasks')
    .select('*, channel:model_channels(provider_type,api_key,api_secret,endpoint,name)')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!task) return errJson('任务不存在', 404);
  if (task.status === 'completed') {
    return okJson({ resultUrls: task.result_urls });
  }
  if (task.status === 'failed') {
    return errJson(task.error_msg || '生成失败', 500);
  }

  const channel = Array.isArray(task.channel) ? task.channel[0] : task.channel;
  if (!channel || !task.external_task_id) {
    return errJson('任务仍在处理中', 202);
  }

  try {
    const urls = await fetchProviderResult(channel, task.external_task_id);
    if (!urls || urls.length === 0) {
      return errJson('任务仍在处理中', 202);
    }

    // 更新任务状态为完成
    await supabase
      .from('generation_tasks')
      .update({
        status: 'completed',
        result_urls: urls,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    return okJson({ resultUrls: urls });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 标记失败 + 退还积分
    await Promise.all([
      supabase.from('generation_tasks').update({
        status: 'failed', error_msg: msg, updated_at: new Date().toISOString(),
      }).eq('id', taskId),
      refundCredits(supabase, userId, task.credits_charged, 'API获取结果失败-退还'),
    ]);
    return errJson(`获取结果失败: ${msg}`, 500);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 平台路由：提交任务
// ═════════════════════════════════════════════════════════════════════════════
async function dispatchToProvider(
  channel: { provider_type: string; model_id: string; api_key: string; api_secret: string; endpoint: string; feature_type: string },
  prompt: string,
  params: Record<string, unknown>,
): Promise<string> {
  switch (channel.provider_type) {
    case 'runninghub': return dispatchRunningHub(channel, prompt, params);
    case 'volc':       return dispatchVolc(channel, prompt, params);
    case 'aliyun':     return dispatchAliyun(channel, prompt, params);
    case 'jimeng':     return dispatchJimeng(channel, prompt, params);
    case 'openai':     return dispatchOpenAI(channel, prompt, params);
    default: throw new Error(`不支持的平台类型: ${channel.provider_type}`);
  }
}

// ─── RunningHub ───────────────────────────────────────────────────────────────
async function dispatchRunningHub(
  channel: { api_key: string; model_id: string; endpoint: string },
  prompt: string,
  params: Record<string, unknown>,
): Promise<string> {
  const base = channel.endpoint || 'https://www.runninghub.cn';
  const res = await fetch(`${base}/task/openapi/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: channel.api_key,
      workflowId: channel.model_id || 'text-to-image-fast',
      nodeInfoList: buildRunningHubNodes(prompt, params),
    }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.msg ?? 'RunningHub提交失败');
  return json.data?.taskId ?? json.data?.task_id ?? '';
}

function buildRunningHubNodes(prompt: string, params: Record<string, unknown>) {
  const { style, ratio, count = 1, quality = 'standard', negativePrompt = '' } = params;
  const [width, height] = parseRatio(String(ratio ?? '1:1'));
  const fullPrompt = [prompt, styleToTag(String(style ?? '')), 'masterpiece, best quality'].filter(Boolean).join(', ');
  return [
    { nodeId: 'positive_prompt', fieldName: 'text',  fieldValue: fullPrompt },
    { nodeId: 'negative_prompt', fieldName: 'text',  fieldValue: String(negativePrompt) || 'blurry, low quality, watermark' },
    { nodeId: 'width',           fieldName: 'value', fieldValue: String(width) },
    { nodeId: 'height',          fieldName: 'value', fieldValue: String(height) },
    { nodeId: 'batch_size',      fieldName: 'value', fieldValue: String(count) },
    { nodeId: 'steps',           fieldName: 'value', fieldValue: qualityToSteps(String(quality)) },
  ];
}

// ─── 火山引擎（豆包/即梦） ────────────────────────────────────────────────────
async function dispatchVolc(
  channel: { api_key: string; api_secret: string; model_id: string; endpoint: string },
  prompt: string,
  params: Record<string, unknown>,
): Promise<string> {
  const base = channel.endpoint || 'https://visual.volcengineapi.com';
  const { ratio = '1:1', style, count = 1 } = params;
  const [width, height] = parseRatio(String(ratio));
  const reqBody = {
    req_key: channel.model_id || 'high_aes_general_v21',
    prompt: [prompt, styleToTag(String(style ?? ''))].filter(Boolean).join(', '),
    width, height,
    use_rephraser: false,
    return_url: true,
    image_urls: [],
    req_schedule_conf: 'general_v20_9B_pe',
    seed: -1,
    scale: 3.5,
    ddim_steps: qualityToStepsNum(String(params.quality ?? 'standard')),
    batch_size: Number(count),
  };

  const res = await fetch(`${base}/?Action=CVProcess&Version=2022-08-31`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `HMAC-SHA256 AccessKeyId=${channel.api_key}`,
      'X-Secret-Key': channel.api_secret,
    },
    body: JSON.stringify(reqBody),
  });
  const json = await res.json();
  if (json.code !== 10000 && json.ResponseMetadata?.Error) {
    throw new Error(json.ResponseMetadata.Error.Message ?? '火山引擎提交失败');
  }
  // 同步返回结果
  const urls: string[] = json.data?.image_urls ?? [];
  if (urls.length > 0) return `volc_sync:${urls.join(',')}`;
  throw new Error('火山引擎未返回图片');
}

// ─── 阿里云通义万相 ────────────────────────────────────────────────────────────
async function dispatchAliyun(
  channel: { api_key: string; model_id: string; endpoint: string },
  prompt: string,
  params: Record<string, unknown>,
): Promise<string> {
  const base = channel.endpoint || 'https://dashscope.aliyuncs.com/api/v1';
  const { ratio = '1:1', style } = params;
  const sizeMap: Record<string, string> = {
    '1:1': '1024*1024', '4:3': '1024*768', '3:4': '768*1024',
    '16:9': '1280*720', '9:16': '720*1280',
  };
  const res = await fetch(`${base}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${channel.api_key}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: channel.model_id || 'wanx2.1-t2i-turbo',
      input: { prompt: [prompt, styleToTag(String(style ?? ''))].filter(Boolean).join(', ') },
      parameters: { size: sizeMap[String(ratio)] ?? '1024*1024', n: Number(params.count ?? 1) },
    }),
  });
  const json = await res.json();
  if (json.code) throw new Error(`${json.code}: ${json.message}`);
  return json.output?.task_id ?? '';
}

// ─── 即梦AI（独立接口） ─────────────────────────────────────────────────────────
async function dispatchJimeng(
  channel: { api_key: string; api_secret: string; model_id: string; endpoint: string },
  prompt: string,
  params: Record<string, unknown>,
): Promise<string> {
  // 即梦使用火山引擎鉴权，走 CVProcess Action
  return dispatchVolc(channel, prompt, params);
}

// ─── OpenAI 兼容格式 ───────────────────────────────────────────────────────────
async function dispatchOpenAI(
  channel: { api_key: string; model_id: string; endpoint: string },
  prompt: string,
  params: Record<string, unknown>,
): Promise<string> {
  const base = channel.endpoint || 'https://api.openai.com/v1';
  const { ratio = '1:1', count = 1, quality = 'standard' } = params;
  const sizeMap: Record<string, string> = {
    '1:1': '1024x1024', '4:3': '1792x1024', '3:4': '1024x1792',
    '16:9': '1792x1024', '9:16': '1024x1792',
  };
  const res = await fetch(`${base}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${channel.api_key}`,
    },
    body: JSON.stringify({
      model: channel.model_id || 'dall-e-3',
      prompt,
      n: Number(count),
      size: sizeMap[String(ratio)] ?? '1024x1024',
      quality: quality === 'superfine' ? 'hd' : 'standard',
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  // OpenAI 同步返回
  const urls = (json.data ?? []).map((d: { url: string }) => d.url);
  return `openai_sync:${urls.join(',')}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// 平台路由：查询状态
// ═════════════════════════════════════════════════════════════════════════════
async function queryProviderStatus(
  channel: { provider_type: string; api_key: string; api_secret: string; endpoint: string },
  externalTaskId: string,
): Promise<{ status: string; progress: number }> {
  // 同步平台（火山/OpenAI）直接返回 completed
  if (externalTaskId.startsWith('volc_sync:') || externalTaskId.startsWith('openai_sync:')) {
    return { status: 'completed', progress: 100 };
  }

  switch (channel.provider_type) {
    case 'runninghub': {
      const base = channel.endpoint || 'https://www.runninghub.cn';
      const res = await fetch(`${base}/task/openapi/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: channel.api_key, taskId: externalTaskId }),
      });
      const json = await res.json();
      const s = json.data?.taskStatus ?? json.data?.status ?? 'RUNNING';
      return {
        status: s === 'SUCCESS' ? 'completed' : s === 'FAILED' ? 'failed' : 'processing',
        progress: json.data?.progress ?? 50,
      };
    }
    case 'aliyun': {
      const base = channel.endpoint || 'https://dashscope.aliyuncs.com/api/v1';
      const res = await fetch(`${base}/tasks/${externalTaskId}`, {
        headers: { 'Authorization': `Bearer ${channel.api_key}` },
      });
      const json = await res.json();
      const s = json.output?.task_status ?? '';
      return {
        status: s === 'SUCCEEDED' ? 'completed' : s === 'FAILED' ? 'failed' : 'processing',
        progress: s === 'SUCCEEDED' ? 100 : 50,
      };
    }
    default:
      return { status: 'processing', progress: 50 };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 平台路由：获取结果
// ═════════════════════════════════════════════════════════════════════════════
async function fetchProviderResult(
  channel: { provider_type: string; api_key: string; endpoint: string },
  externalTaskId: string,
): Promise<string[]> {
  // 同步平台直接从 taskId 中提取 URL
  if (externalTaskId.startsWith('volc_sync:')) {
    return externalTaskId.replace('volc_sync:', '').split(',').filter(Boolean);
  }
  if (externalTaskId.startsWith('openai_sync:')) {
    return externalTaskId.replace('openai_sync:', '').split(',').filter(Boolean);
  }

  switch (channel.provider_type) {
    case 'runninghub': {
      const base = channel.endpoint || 'https://www.runninghub.cn';
      const res = await fetch(`${base}/task/openapi/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: channel.api_key, taskId: externalTaskId }),
      });
      const json = await res.json();
      if (json.code !== 0) return [];
      const outputs: Array<{ fileType: string; fileUrl: string }> = json.data ?? [];
      return outputs
        .filter(o => o.fileType === 'IMAGE' || o.fileUrl?.match(/\.(jpg|jpeg|png|webp)/i))
        .map(o => o.fileUrl);
    }
    case 'aliyun': {
      const base = channel.endpoint || 'https://dashscope.aliyuncs.com/api/v1';
      const res = await fetch(`${base}/tasks/${externalTaskId}`, {
        headers: { 'Authorization': `Bearer ${channel.api_key}` },
      });
      const json = await res.json();
      if (json.output?.task_status !== 'SUCCEEDED') return [];
      return (json.output?.results ?? []).map((r: { url: string }) => r.url).filter(Boolean);
    }
    default:
      return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═════════════════════════════════════════════════════════════════════════════
async function refundCredits(
  supabase: ReturnType<typeof sb>,
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await supabase.rpc('fn_add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_source: 'refund',
  }).then(({ error }) => {
    if (error) console.error('[dispatch-generation] 退还积分失败:', error.message);
  });
}

const STYLE_TAGS: Record<string, string> = {
  realistic:   'photorealistic, ultra-detailed, professional photography, 8k resolution',
  anime:       'anime style, vibrant colors, clean linework, manga aesthetics',
  oilpainting: 'oil painting, thick brushstrokes, artistic texture, impressionist',
  cyberpunk:   'cyberpunk aesthetic, neon lights, dark futuristic city',
  chinese:     'Chinese ink painting, traditional brushwork, oriental aesthetics',
  '3d':        '3D render, octane render, volumetric lighting',
  pixel:       'pixel art, retro game style, 16-bit',
  sketch:      'pencil sketch, black and white, detailed line art',
};

function styleToTag(style: string): string {
  return STYLE_TAGS[style] ?? '';
}

function parseRatio(ratio: string): [number, number] {
  const map: Record<string, [number, number]> = {
    '1:1': [1024, 1024], '4:3': [1024, 768], '3:4': [768, 1024],
    '16:9': [1280, 720], '9:16': [720, 1280],
  };
  return map[ratio] ?? [1024, 1024];
}

function qualityToSteps(q: string): string {
  return String(qualityToStepsNum(q));
}

function qualityToStepsNum(q: string): number {
  return ({ standard: 20, fine: 30, superfine: 50 }[q] ?? 20);
}
