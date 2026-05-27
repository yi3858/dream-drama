#!/bin/bash
set -e

echo "========================================"
echo "  筑梦呈剧 - 一键构建脚本"
echo "========================================"

# 检查是否安装了必要工具
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js，请先安装 Node.js 20+"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "📦 正在安装 pnpm..."
    npm install -g pnpm
fi

echo ""
echo "📦 步骤 1/3：安装依赖..."
pnpm install --frozen-lockfile

echo ""
echo "🔨 步骤 2/3：构建生产版本..."
npx vite build --config vite.config.ts

echo ""
echo "✅ 步骤 3/3：构建完成！"
echo ""
echo "📁 构建产物目录：./dist"
echo ""
echo "接下来您可以："
echo "  1. 将 dist 目录上传到服务器部署"
echo "  2. 运行 ./deploy.sh 使用 Docker 一键部署"
echo "  3. 运行 docker-compose up --build 启动容器"
echo ""
echo "========================================"
