#!/bin/bash
# ============================================
# AI漫剧制作平台 - 原生服务器一键部署脚本
# 适用于：未安装 Docker，直接用 Nginx 托管
# 使用方式：chmod +x deploy-native.sh && ./deploy-native.sh
# ============================================

set -e

# ---- 颜色输出 ----
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "============================================"
echo "   AI漫剧制作平台 - 原生 Nginx 部署脚本"
echo "============================================"
echo ""

# ---- 配置项（按需修改）----
DEPLOY_DIR="/www/wwwroot/ai-manga/dist"   # 部署目标目录
NGINX_CONF_DIR="/etc/nginx/conf.d"        # Nginx 配置目录
NGINX_CONF_NAME="ai-manga.conf"           # Nginx 配置文件名
NODE_VERSION="20"                          # 构建所需 Node.js 版本

# ---- 步骤 1：检查依赖 ----
info "检查系统依赖..."

if ! command -v nginx &>/dev/null; then
    warn "未检测到 Nginx，正在安装..."
    if command -v apt-get &>/dev/null; then
        apt-get update -qq && apt-get install -y nginx
    elif command -v yum &>/dev/null; then
        yum install -y nginx
    else
        error "无法自动安装 Nginx，请手动安装后重试"
    fi
fi
info "Nginx: $(nginx -v 2>&1)"

if ! command -v node &>/dev/null; then
    warn "未检测到 Node.js，正在安装 Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
info "Node.js: $(node -v)"

if ! command -v pnpm &>/dev/null; then
    info "安装 pnpm..."
    npm install -g pnpm
fi
info "pnpm: $(pnpm -v)"

# ---- 步骤 2：检查 .env 文件 ----
info "检查环境变量配置..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        warn "未找到 .env 文件，已从 .env.example 复制，请填写 Supabase 配置后重新运行"
        cp .env.example .env
        echo ""
        echo "请编辑 .env 文件填写以下必填项："
        echo "  VITE_SUPABASE_URL=你的Supabase项目URL"
        echo "  VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥"
        echo ""
        exit 0
    else
        error "未找到 .env 文件，请创建并填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY"
    fi
fi
info ".env 文件检查通过"

# ---- 步骤 3：安装依赖并构建 ----
info "安装项目依赖..."
pnpm install --frozen-lockfile

info "构建生产版本..."
npx vite build --config vite.config.ts
info "构建完成，产物目录: ./dist"

# ---- 步骤 4：部署静态文件 ----
info "部署静态文件到 ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
rm -rf "${DEPLOY_DIR}"/*
cp -r dist/* "${DEPLOY_DIR}/"
info "静态文件部署完成"

# ---- 步骤 5：配置 Nginx ----
info "配置 Nginx..."
if [ -f "nginx-ai-manga.conf" ]; then
    # 替换配置文件中的路径占位符为实际路径
    sed "s|/www/wwwroot/ai-manga/dist|${DEPLOY_DIR}|g" nginx-ai-manga.conf \
        > "${NGINX_CONF_DIR}/${NGINX_CONF_NAME}"
    info "Nginx 配置已写入 ${NGINX_CONF_DIR}/${NGINX_CONF_NAME}"
else
    warn "未找到 nginx-ai-manga.conf，手动写入默认配置..."
    cat > "${NGINX_CONF_DIR}/${NGINX_CONF_NAME}" <<EOF
server {
    listen 80;
    server_name _;
    root ${DEPLOY_DIR};
    index index.html;
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
fi

# ---- 步骤 6：测试并重载 Nginx ----
info "测试 Nginx 配置..."
nginx -t || error "Nginx 配置测试失败，请检查配置文件"

info "重载 Nginx..."
nginx -s reload || systemctl reload nginx || service nginx reload

# ---- 完成 ----
echo ""
echo "============================================"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "  网站地址: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
echo "  文件目录: ${DEPLOY_DIR}"
echo "  Nginx 配置: ${NGINX_CONF_DIR}/${NGINX_CONF_NAME}"
echo ""
echo "常用命令:"
echo "  nginx -t               # 测试配置"
echo "  nginx -s reload        # 重载配置"
echo "  systemctl status nginx # 查看 Nginx 状态"
echo "  tail -f /var/log/nginx/ai-manga.error.log  # 查看错误日志"
echo "============================================"
echo ""
