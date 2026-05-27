# 阶段一：构建前端应用
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件并安装
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制项目源码
COPY . .

# 构建生产版本
RUN npx vite build --config vite.config.ts

# 阶段二：使用 Nginx 托管静态资源
FROM nginx:alpine

# 复制自定义 Nginx 配置（包含 SPA fallback 规则）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物到 Nginx 默认目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
