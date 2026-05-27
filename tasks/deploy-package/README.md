# AI漫剧制作平台 - 部署说明

## 项目架构

```
前端：React + TypeScript + Vite → 编译为静态文件
后端：Supabase（云端数据库 + Edge Functions）
部署：Nginx 托管静态文件（无需 Node.js/Python 进程）
```

---

## 方案一：Docker 部署（推荐，最简单）

### 前提条件
- 服务器已安装 Docker

### 步骤

```bash
# 1. 上传源码到服务器
scp -r . root@你的服务器IP:/opt/ai-manga/

# 2. 进入目录
ssh root@你的服务器IP
cd /opt/ai-manga

# 3. 配置环境变量
cp .env.example .env
vi .env   # 填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY

# 4. 一键部署
chmod +x deploy-docker.sh && ./deploy-docker.sh
```

---

## 方案二：原生 Nginx 部署

### 前提条件
- 服务器已安装 Nginx
- 服务器已安装 Node.js 20+

### 步骤

```bash
# 1. 上传源码到服务器
scp -r . root@你的服务器IP:/opt/ai-manga/

# 2. 进入目录
ssh root@你的服务器IP
cd /opt/ai-manga

# 3. 配置环境变量
cp .env.example .env
vi .env   # 填写 Supabase 配置

# 4. 一键构建并部署
chmod +x deploy-native.sh && ./deploy-native.sh
```

---

## 方案三：宝塔面板部署

### 步骤

1. **本地构建**（需要 Node.js 20+）
   ```bash
   cp .env.example .env
   # 编辑 .env 填写 Supabase 配置
   npm install -g pnpm
   pnpm install
   npx vite build --config vite.config.ts
   # 构建完成后生成 dist/ 目录
   ```

2. **宝塔面板操作**
   - 网站 → 添加站点 → PHP版本选"纯静态"
   - 上传 `dist/` 目录下所有文件到网站根目录
   - 网站设置 → 配置文件 → `location /` 块改为：
     ```nginx
     location / {
         try_files $uri $uri/ /index.html;
     }
     ```
   - 保存 → 重启 Nginx

---

## 环境变量说明

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | Supabase 控制台 → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名公钥 | Supabase 控制台 → Settings → API |

---

## 常见问题

**Q: 刷新 /admin 页面出现 404？**
A: Nginx 配置缺少 `try_files $uri $uri/ /index.html;`，参考 `nginx-ai-manga.conf`。

**Q: 管理后台打不开？**
A: 需要用 `role = 'admin'` 的账号登录，普通账号会被自动跳转到首页。

**Q: 需要独立后端服务吗？**
A: 不需要。本项目所有业务逻辑通过 Supabase 云端处理，服务器只需运行 Nginx。
