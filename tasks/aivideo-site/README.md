# AI视频生成平台 — 完整源码

简约商务风格，响应式自适应（PC + 手机双端），包含完整前后端源码。

---

## 📁 文件结构

```
aivideo-site/
├── index.html       首页（介绍 + 定价 + FAQ）
├── submit.html      视频生成提交页（填参数 → 确认 → 提交）
├── result.html      任务进度 + 视频播放页
├── profile.html     个人中心（积分 + 充值 + 账单 + 设置）
├── style.css        公共样式（响应式设计系统）
├── server.js        Node.js 后端服务（原生，无依赖）
├── package.json     项目配置
└── README.md        本文件
```

---

## 🚀 快速启动

### 方式一：纯静态（最简单）

直接把所有 HTML + CSS 文件上传到任意服务器，用浏览器打开 `index.html` 即可。

> 适合：无服务器、只需前端演示的场景
> 数据存储在浏览器 localStorage，刷新保留

### 方式二：完整前后端（推荐）

```bash
# 1. 将整个目录上传到服务器
# 2. 确保 Node.js 18+ 已安装
node -v

# 3. 启动服务器（无需安装依赖，纯原生）
node server.js

# 默认端口 3000，访问 http://你的IP:3000
# 自定义端口：
PORT=8080 node server.js
```

---

## 📐 页面说明

| 页面 | 功能 |
|------|------|
| `index.html` | 首页：平台介绍、统计数据、功能特色、如何使用、定价、FAQ、CTA |
| `submit.html` | 提交页：提示词输入、风格模板快选、分辨率/时长/比例/高级参数设置、费用预估、三步提交流程 |
| `result.html` | 结果页：实时进度条、阶段指示、视频播放器、下载、任务历史列表 |
| `profile.html` | 个人中心：账户概览、积分充值、账单记录、账户设置（密码/通知） |

---

## 📱 响应式适配

| 屏幕 | 效果 |
|------|------|
| PC 1920px+ | 完整横版布局，侧边栏 + 内容区 |
| PC 1280px  | 标准布局，两列网格 |
| 平板 768px  | 适配排版，导航收缩 |
| 手机 375px  | 竖版单列，汉堡菜单，大按钮，防 iOS 字体放大 |

---

## 🔌 后端 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/api/config`         | 获取分辨率/时长等配置 |
| `GET`  | `/api/user/profile`   | 获取用户信息和积分 |
| `POST` | `/api/user/recharge`  | 充值积分（演示） |
| `POST` | `/api/tasks`          | 提交生成任务 |
| `GET`  | `/api/tasks`          | 获取任务列表（支持 status/page/size 筛选） |
| `GET`  | `/api/tasks/:id`      | 获取单个任务详情 |

### 提交任务示例

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":     "宇宙星云爆炸，电影级画质，4K超清",
    "resolution": "1080p",
    "duration":   "10",
    "ratio":      "16:9",
    "fps":        30
  }'
```

---

## 🎨 设计规范

- 主色：`#4F46E5`（靛蓝）
- 背景：`#F8FAFC`（浅灰）
- 卡片：白色 + `1px` 边框 + 轻阴影
- 字体：系统字体栈（PingFang SC / Microsoft YaHei）
- 无外部 CSS 框架依赖，样式全部在 `style.css`

---

## ⚙️ 对接真实 AI 接口

在 `server.js` 中找到 `simulateTask()` 函数，替换为真实 AI 视频生成 API 调用：

```javascript
// 替换 simulateTask 中的逻辑，调用真实接口，例如：
const response = await fetch('https://your-ai-api.com/v1/generate', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: task.prompt, resolution: task.resolution, duration: task.duration }),
});
const result = await response.json();
task.videoUrl = result.videoUrl;
task.status   = 'done';
```

---

## 📋 部署清单

- [ ] 上传所有文件到服务器
- [ ] 确认 Node.js 18+ 已安装
- [ ] 运行 `node server.js`
- [ ] 配置反向代理（Nginx/Apache，可选）
- [ ] 替换 `server.js` 中的 AI 接口调用
- [ ] 接入真实支付（微信/支付宝）
- [ ] 配置 HTTPS（生产环境必须）

---

MIT License · 2026 AI视频生成平台
