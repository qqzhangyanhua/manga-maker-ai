#!/bin/bash

# 灵感模式 API 测试脚本
# 用于验证 API 路由是否正常工作

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 灵感模式 API 测试"
echo "===================="
echo ""

# 1. 检查 FastAPI 后端
echo "1️⃣  检查 FastAPI 后端..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ FastAPI 后端正常运行${NC}"
    curl -s http://localhost:8000/health | jq .
else
    echo -e "${RED}❌ FastAPI 后端未运行${NC}"
    echo "请启动后端："
    echo "  cd services/novel-backend"
    echo "  source .venv/bin/activate"
    echo "  uvicorn app.main:app --reload --port 8000"
    exit 1
fi

echo ""

# 2. 检查 Next.js 代理
echo "2️⃣  检查 Next.js 代理路由..."
if [ -f "src/app/api/novel/[...path]/route.ts" ]; then
    echo -e "${GREEN}✅ 代理路由文件存在${NC}"
else
    echo -e "${RED}❌ 代理路由文件不存在${NC}"
    exit 1
fi

echo ""

# 3. 测试灵感模式 API（需要登录）
echo "3️⃣  测试灵感模式 API..."
echo -e "${YELLOW}⚠️  此测试需要有效的登录 token${NC}"
echo ""

# 提示用户输入 token
read -p "请输入 JWT token (或按 Enter 跳过): " JWT_TOKEN

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  跳过 API 测试（需要登录）${NC}"
    echo ""
    echo "如需测试，请："
    echo "1. 在浏览器中登录 http://localhost:3000"
    echo "2. 打开开发者工具 > Application > Cookies"
    echo "3. 复制 comicai_session 的值"
    echo "4. 重新运行此脚本并粘贴 token"
else
    echo "测试 /api/novel/inspiration/start..."

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST http://localhost:3000/api/novel/inspiration/start \
        -H "Content-Type: application/json" \
        -H "Cookie: comicai_session=$JWT_TOKEN")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ API 调用成功${NC}"
        echo "$BODY" | jq .
    else
        echo -e "${RED}❌ API 调用失败 (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    fi
fi

echo ""

# 4. 检查环境变量
echo "4️⃣  检查环境变量..."
if grep -q "NOVEL_SERVICE_URL=http://localhost:8000" .env 2>/dev/null; then
    echo -e "${GREEN}✅ NOVEL_SERVICE_URL 配置正确${NC}"
else
    echo -e "${YELLOW}⚠️  NOVEL_SERVICE_URL 未配置或不正确${NC}"
fi

if grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${GREEN}✅ OPENAI_API_KEY 已配置${NC}"
else
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY 未配置${NC}"
fi

echo ""

# 5. 检查 JWT Secret 一致性
echo "5️⃣  检查 JWT Secret 一致性..."
NEXTJS_SECRET=$(grep "^AUTH_SECRET=" .env 2>/dev/null | cut -d'=' -f2)
FASTAPI_SECRET=$(grep "^JWT_SECRET=" services/novel-backend/.env 2>/dev/null | cut -d'=' -f2)

if [ -z "$NEXTJS_SECRET" ]; then
    echo -e "${RED}❌ Next.js AUTH_SECRET 未配置${NC}"
elif [ -z "$FASTAPI_SECRET" ]; then
    echo -e "${YELLOW}⚠️  FastAPI JWT_SECRET 未配置${NC}"
    echo "建议在 services/novel-backend/.env 中添加："
    echo "JWT_SECRET=$NEXTJS_SECRET"
elif [ "$NEXTJS_SECRET" = "$FASTAPI_SECRET" ]; then
    echo -e "${GREEN}✅ JWT Secret 一致${NC}"
else
    echo -e "${RED}❌ JWT Secret 不一致${NC}"
    echo "Next.js: $NEXTJS_SECRET"
    echo "FastAPI: $FASTAPI_SECRET"
    echo ""
    echo "请确保两者相同！"
fi

echo ""
echo "===================="
echo "✅ 测试完成"
