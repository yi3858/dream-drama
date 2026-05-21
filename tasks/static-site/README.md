# 漫绘星球 - 完整静态网站

## 📁 文件清单

| 文件 | 页面 | 说明 |
|------|------|------|
| `index.html` | 主页 | 网站入口，含 Hero、统计、功能介绍、作品展示 |
| `novel-to-comic.html` | 小说转漫剧 | 4步创作流程：输入→分镜→角色→生成 |
| `video-to-anime.html` | 短剧转动漫 | 视频上传→风格选择→高级设置→AI转换 |
| `showcase.html` | 作品案例 | 作品展示、筛选、搜索 |
| `pricing.html` | 积分充值 | 个人/企业套餐，支付弹窗 |
| `agent.html` | 代理招商 | 代理等级介绍、申请表单、FAQ |
| `login.html` | 登录 | 用户名密码登录、微信扫码入口 |
| `register.html` | 注册 | 表单验证、密码强度、邀请码 |
| `style.css` | 公共样式 | 全站统一主题、组件样式 |

## 🚀 部署说明

### 方法一：直接上传（推荐）
将本文件夹内所有文件上传至服务器的网站根目录即可，**无需任何编译或依赖**。

### 方法二：Nginx 配置示例
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 方法三：Apache
将文件放入 `/var/www/html/` 或 `htdocs/` 即可，无需 `.htaccess`。

## ✅ 支持的服务器类型
- ✅ 任意静态文件服务器（Nginx、Apache、Caddy 等）
- ✅ CDN（阿里云 OSS、腾讯云 COS、七牛云等）
- ✅ GitHub Pages / Cloudflare Pages / Vercel
- ✅ 宝塔面板直接上传
- ✅ FTP 上传至虚拟主机

## 📝 自定义配置
- **联系方式**：全局搜索 `support@mhxq.com` 和 `mhxq_service` 替换为你的真实联系方式
- **版权信息**：全局搜索 `© 2026 漫绘星球` 替换为你的信息
- **后端接入**：登录/注册/支付等表单可在 `login.html`、`register.html`、`pricing.html` 中对接真实 API
