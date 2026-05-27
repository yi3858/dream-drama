#!/bin/bash
set -e

echo "========================================"
echo "  筑梦呈剧 - Docker 一键部署脚本"
echo "========================================"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：未找到 Docker，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误：未找到 docker-compose，请先安装 Docker Compose"
    exit 1
fi

echo ""
echo "🐳 正在构建并启动容器..."
docker-compose down 2>/dev/null || true
docker-compose up --build -d

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 网站已运行在 http://localhost"
echo ""
echo "常用命令："
echo "  docker-compose logs -f    # 查看实时日志"
echo "  docker-compose down         # 停止服务"
echo "  docker-compose restart      # 重启服务"
echo ""
echo "========================================"
