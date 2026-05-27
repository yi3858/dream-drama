#!/bin/bash
# ============================================
# AI漫剧制作平台 - Docker 一键部署脚本（更新版）
# 适用于：服务器已安装 Docker 和 docker-compose
# 使用方式：chmod +x deploy-docker.sh && ./deploy-docker.sh
# ============================================

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "============================================"
echo "   AI漫剧制作平台 - Docker 部署脚本"
echo "============================================"
echo ""

# 检查 Docker
command -v docker &>/dev/null || error "未找到 Docker，请先安装: https://docs.docker.com/get-docker/"

# 检查 .env
if [ ! -f ".env" ]; then
    [ -f ".env.example" ] && cp .env.example .env && \
        warn "已创建 .env，请填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 后重新运行" && exit 0
    error "未找到 .env 文件"
fi

info "停止旧容器..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

info "构建镜像并启动..."
docker compose up --build -d 2>/dev/null || docker-compose up --build -d

info "等待服务就绪..."
sleep 3

# 检查容器状态
if docker compose ps 2>/dev/null | grep -q "Up" || docker-compose ps 2>/dev/null | grep -q "Up"; then
    echo ""
    echo "============================================"
    echo -e "${GREEN}✅ 部署完成！${NC}"
    echo ""
    echo "  网站地址: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
    echo ""
    echo "常用命令:"
    echo "  docker compose logs -f      # 查看实时日志"
    echo "  docker compose ps           # 查看容器状态"
    echo "  docker compose down         # 停止服务"
    echo "  docker compose restart      # 重启服务"
    echo "============================================"
else
    warn "容器可能未正常启动，请检查日志："
    docker compose logs --tail 30 2>/dev/null || docker-compose logs --tail 30
fi
