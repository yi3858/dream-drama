/**
 * AI视频生成平台 — Node.js 后端服务器
 * 
 * 环境要求：Node.js 18+
 * 启动方式：node server.js
 * 
 * 接口列表：
 *   POST /api/tasks          提交生成任务
 *   GET  /api/tasks          获取任务列表（支持分页）
 *   GET  /api/tasks/:id      获取单个任务详情
 *   GET  /api/user/profile   获取用户信息
 *   POST /api/user/recharge  充值积分（演示）
 *   GET  /api/config         获取公共配置（分辨率/时长选项等）
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const url     = require('url');

// ===== 配置 =====
const PORT      = process.env.PORT || 3000;
const DATA_DIR  = path.join(__dirname, 'data');
const VIDEO_DIR = path.join(__dirname, 'public', 'videos');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR))      fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(VIDEO_DIR))     fs.mkdirSync(VIDEO_DIR, { recursive: true });

// ===== 简单文件数据库 =====
const DB_FILE = path.join(DATA_DIR, 'db.json');

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {}
  return { tasks: [], users: { demo: { name: '演示用户', credits: 1250, role: 'user' } } };
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ===== 积分计算 =====
const RES_RATE   = { '720p': 1.0, '1080p': 1.8, '4k': 3.6 };
const DUR_MULT   = { '5': 1, '10': 1.8, '15': 2.5, '30': 4.5, '60': 8 };
const BASE_COST  = { '720p': 50, '1080p': 90, '4k': 180 };

function calcCost(res, dur) {
  const base = BASE_COST[res] || 90;
  const mult = DUR_MULT[String(dur)] || 1;
  return Math.round(base * mult);
}

// ===== 模拟 AI 生成进度 =====
const STAGES = [
  { name: '排队等待',   pct: 8   },
  { name: '解析提示词', pct: 22  },
  { name: '生成关键帧', pct: 55  },
  { name: '视频合成',   pct: 82  },
  { name: '后处理压缩', pct: 98  },
  { name: '生成完毕',   pct: 100 },
];

function simulateTask(taskId) {
  let idx = 0;
  const interval = setInterval(() => {
    const db   = readDB();
    const task = db.tasks.find(t => t.id === taskId);
    if (!task || task.status === 'done' || task.status === 'failed') {
      clearInterval(interval);
      return;
    }
    const stage = STAGES[idx];
    task.progress  = stage.pct;
    task.stageName = stage.name;
    if (stage.pct >= 100) {
      task.status   = 'done';
      task.doneAt   = new Date().toISOString();
      task.videoUrl = `/public/videos/${taskId}.mp4`; // 替换为真实视频 URL
      clearInterval(interval);
    }
    writeDB(db);
    idx = Math.min(idx + 1, STAGES.length - 1);
  }, 3000); // 每3秒推进一阶段（演示速度，实际按真实AI接口回调）
}

// ===== 路由处理 =====
const ROUTES = {};

function route(method, path, handler) {
  ROUTES[method + ':' + path] = handler;
}

// 通用配置
route('GET', '/api/config', (req, res) => {
  sendJSON(res, {
    resolutions: [
      { value: '720p',  label: '720P 标准',  baseCost: 50  },
      { value: '1080p', label: '1080P 高清',  baseCost: 90  },
      { value: '4k',    label: '4K 超高清', baseCost: 180 },
    ],
    durations: [
      { value: '5',  label: '5秒',  mult: 1   },
      { value: '10', label: '10秒', mult: 1.8 },
      { value: '15', label: '15秒', mult: 2.5 },
      { value: '30', label: '30秒', mult: 4.5 },
      { value: '60', label: '60秒', mult: 8   },
    ],
    ratios: ['16:9', '9:16', '1:1'],
    fpsList: [24, 30, 60],
  });
});

// 用户信息
route('GET', '/api/user/profile', (req, res) => {
  const db   = readDB();
  const user = db.users['demo'] || {};
  sendJSON(res, {
    name:    user.name   || '演示用户',
    credits: user.credits ?? 1250,
    role:    user.role   || 'user',
  });
});

// 充值（演示：直接加积分）
route('POST', '/api/user/recharge', async (req, res) => {
  const body   = await readBody(req);
  const { amount, credits } = JSON.parse(body || '{}');
  if (!amount || !credits) return sendError(res, 400, '参数错误');
  const db = readDB();
  db.users['demo'].credits = (db.users['demo'].credits || 0) + credits;
  writeDB(db);
  sendJSON(res, { success: true, credits: db.users['demo'].credits });
});

// 提交任务
route('POST', '/api/tasks', async (req, res) => {
  const body = await readBody(req);
  let data;
  try { data = JSON.parse(body); } catch { return sendError(res, 400, '参数格式错误'); }

  const { prompt, resolution = '1080p', duration = '5', ratio = '16:9', fps = 30, negPrompt = '', seed } = data;
  if (!prompt || prompt.trim().length < 4) return sendError(res, 400, '提示词不能为空');

  const db = readDB();
  const user = db.users['demo'];
  const cost = calcCost(resolution, duration);

  if (user.credits < cost) return sendError(res, 402, `积分不足（当前：${user.credits}，需要：${cost}）`);

  user.credits -= cost;

  const task = {
    id:         'T' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    prompt:     prompt.trim(),
    resolution,
    duration,
    ratio,
    fps,
    negPrompt,
    seed:       seed || Math.floor(Math.random() * 999999),
    cost,
    status:     'processing',
    progress:   0,
    stageName:  '排队等待',
    videoUrl:   null,
    createdAt:  new Date().toISOString(),
    doneAt:     null,
  };

  db.tasks.unshift(task);
  db.tasks = db.tasks.slice(0, 500); // 最多保留500条
  writeDB(db);

  // 启动模拟进度
  simulateTask(task.id);

  sendJSON(res, { taskId: task.id, cost, balance: user.credits });
});

// 任务列表
route('GET', '/api/tasks', (req, res) => {
  const db     = readDB();
  const qs     = new url.URL('http://x' + req.url).searchParams;
  const status = qs.get('status');
  const page   = Math.max(1, parseInt(qs.get('page') || '1'));
  const size   = Math.min(50, parseInt(qs.get('size') || '20'));

  let tasks = db.tasks;
  if (status && status !== 'all') tasks = tasks.filter(t => t.status === status);

  const total = tasks.length;
  const slice = tasks.slice((page - 1) * size, page * size);
  sendJSON(res, { total, page, size, list: slice });
});

// 单个任务详情（支持 /api/tasks/:id）
function handleTaskDetail(req, res, id) {
  const db   = readDB();
  const task = db.tasks.find(t => t.id === id);
  if (!task) return sendError(res, 404, '任务不存在');
  sendJSON(res, task);
}

// ===== 静态文件服务 =====
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.mp4':  'video/mp4',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

// ===== HTTP 服务器 =====
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsedUrl  = url.parse(req.url);
  const pathname   = parsedUrl.pathname;

  // API 路由
  if (pathname.startsWith('/api/')) {
    const key = req.method + ':' + pathname;

    // 精确匹配
    if (ROUTES[key]) return ROUTES[key](req, res);

    // 动态路由 /api/tasks/:id
    const m = pathname.match(/^\/api\/tasks\/([A-Za-z0-9]+)$/);
    if (m && req.method === 'GET') return handleTaskDetail(req, res, m[1]);

    sendError(res, 404, '接口不存在');
    return;
  }

  // 静态文件
  let target = pathname === '/' ? '/index.html' : pathname;
  const safe = path.normalize(target).replace(/^(\.\.[/\\])+/, '');
  serveFile(res, path.join(__dirname, safe));
});

// ===== 工具函数 =====
function sendJSON(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ code: 0, data, ts: Date.now() }));
}

function sendError(res, code, message) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ code, message, ts: Date.now() }));
}

function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

// ===== 启动 =====
server.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `
  ╔═════════════════════════════════════╗
  ║   AI视频生成平台 — 后端服务已启动    ║
  ╠═════════════════════════════════════╣
  ║  本地访问: http://localhost:${PORT}      ║
  ║  数据目录: ./data/db.json           ║
  ║  视频目录: ./public/videos/         ║
  ╚═════════════════════════════════════╝
  `);
});
