#!/bin/bash

# Novel Backend API 文档查看脚本
# 启动 FastAPI 服务并自动打开 Swagger UI

set -e

echo "🚀 启动 Novel Backend Service..."
echo ""

# 检查虚拟环境
if [ ! -d ".venv" ]; then
    echo "❌ 虚拟环境不存在，请先运行以下命令创建："
    echo "   python3 -m venv .venv"
    echo "   source .venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# 激活虚拟环境
source .venv/bin/activate

# 检查依赖
if ! python -c "import fastapi" 2>/dev/null; then
    echo "❌ 依赖未安装，正在安装..."
    pip install -r requirements.txt
fi

# 检查环境变量
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，使用 .env.example 创建..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置必要的环境变量（DATABASE_URL, OPENAI_API_KEY 等）"
    echo ""
fi

echo "✅ 环境准备完成"
echo ""
echo "📚 Swagger UI 将在浏览器中打开："
echo "   http://localhost:8000/docs"
echo ""
echo "📘 ReDoc UI:"
echo "   http://localhost:8000/redoc"
echo ""
echo "🔗 OpenAPI JSON:"
echo "   http://localhost:8000/openapi.json"
echo ""
echo "💡 按 Ctrl+C 停止服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 在后台等待 2 秒后打开浏览器
(sleep 2 && open http://localhost:8000/docs) &

# 启动 FastAPI 服务
uvicorn app.main:app --reload --port 8000
