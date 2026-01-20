#!/bin/bash

# Swagger UI 快速访问脚本
# 自动启动两个 Swagger UI 并在浏览器中打开

echo "🚀 启动 Manga Maker AI Swagger UI..."
echo ""

# 检查端口占用
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# 启动 FastAPI
echo "1️⃣  启动 FastAPI Backend..."
cd /Users/zhangyanhua/AI/manga-maker-ai/services/novel-backend

if check_port 8000; then
    echo "   ⚠️  端口 8000 已被占用，FastAPI 可能已经在运行"
else
    source .venv/bin/activate
    uvicorn app.main:app --reload --port 8000 > /tmp/fastapi.log 2>&1 &
    FASTAPI_PID=$!
    echo "   ✅ FastAPI 已启动 (PID: $FASTAPI_PID)"
    sleep 3
fi

# 启动 Next.js
echo "2️⃣  启动 Next.js Frontend..."
cd /Users/zhangyanhua/AI/manga-maker-ai

if check_port 3000; then
    echo "   ⚠️  端口 3000 已被占用，Next.js 可能已经在运行"
else
    pnpm run dev > /tmp/nextjs.log 2>&1 &
    NEXTJS_PID=$!
    echo "   ✅ Next.js 已启动 (PID: $NEXTJS_PID)"
    sleep 8
fi

# 检测 Next.js 实际端口
NEXTJS_PORT=$(lsof -ti:3000 > /dev/null 2>&1 && echo "3000" || (lsof -ti:3001 > /dev/null 2>&1 && echo "3001" || echo "3002"))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 所有服务已启动！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📘 FastAPI Swagger UI:"
echo "   http://localhost:8000/docs"
echo ""
echo "📘 Next.js Swagger UI:"
echo "   http://localhost:$NEXTJS_PORT/api-docs"
echo ""
echo "📄 OpenAPI JSON:"
echo "   http://localhost:8000/openapi.json (FastAPI)"
echo "   http://localhost:$NEXTJS_PORT/api/doc (Next.js)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 提示："
echo "   - FastAPI: 小说生成相关 API (85 个 endpoints)"
echo "   - Next.js: 漫画创作相关 API (7 个 endpoints)"
echo ""
echo "🔐 认证测试："
echo "   - FastAPI: 需要 JWT Bearer Token"
echo "   - Next.js: 使用 HTTP-only Cookie (自动)"
echo ""
echo "🛑 停止服务："
echo "   pkill -f 'uvicorn app.main:app'"
echo "   pkill -f 'pnpm run dev'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 等待 2 秒后自动打开浏览器
sleep 2

# macOS 打开浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 在浏览器中打开 Swagger UI..."
    open http://localhost:8000/docs
    sleep 1
    open http://localhost:$NEXTJS_PORT/api-docs
fi

echo ""
echo "✨ 按 Ctrl+C 可查看日志，或直接访问上述 URL"
echo ""

# 显示实时日志（可选）
# tail -f /tmp/fastapi.log /tmp/nextjs.log
