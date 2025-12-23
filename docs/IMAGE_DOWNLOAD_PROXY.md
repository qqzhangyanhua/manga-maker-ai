# 图片下载代理配置指南

## 问题描述

当使用 OpenAI/DALL-E 或其他返回图片URL的API时，服务器端需要下载这些URL。如果URL需要代理访问（如 `files.closeai.fans`），则需要配置代理。

## 解决方案

### 1. 配置代理

编辑 `.env` 文件，添加代理配置：

```bash
# 代理配置（用于访问外部图片URL）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

**常见代理端口：**
- Clash: `http://127.0.0.1:7890`
- V2Ray: `http://127.0.0.1:10809`
- Shadowsocks: `http://127.0.0.1:1080`

### 2. 重启应用

配置代理后，重启Next.js应用：

```bash
# 停止当前运行的应用
# 然后重新启动
pnpm dev
```

### 3. 测试

再次调用图片生成接口，检查日志中是否显示：

```
使用代理: http://127.0.0.1:7890
下载图片 #1: https://files.closeai.fans/...
✓ 图片 #1 下载成功，大小: XXX KB
```

## 代理工作原理

代码会：
1. 检查环境变量 `HTTP_PROXY` 或 `HTTPS_PROXY`
2. 如果配置了代理，使用 `undici` 的 `ProxyAgent` 下载图片
3. 如果没有配置，直接使用原生 fetch

## 替代方案

如果不想配置代理，可以：

### 方案A：使用Stable Diffusion (推荐)

Stable Diffusion 直接返回 base64 数据，不需要下载URL：

1. 部署 Stable Diffusion WebUI
2. 在 `/admin/llm-providers` 添加配置：
   - provider_type: `image_generation`
   - provider_name: `sd`
   - base_url: `http://localhost:7860`

### 方案B：要求API返回base64

某些OpenAI兼容API支持配置返回base64而不是URL。检查你的API文档。

## 故障排查

### 代理未生效

检查：
1. 代理软件是否运行
2. 端口号是否正确
3. 是否允许局域网连接
4. `.env` 文件是否保存
5. 应用是否重启

### 仍然失败

查看完整日志：
```bash
tail -f logs/app.log
```

或在浏览器开发者工具的Network标签查看详细错误。
