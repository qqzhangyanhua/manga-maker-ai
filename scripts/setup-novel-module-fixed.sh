#!/bin/bash

# AI 小说创作模块 - 快速安装脚本（修正版）
# 用法: ./scripts/setup-novel-module-fixed.sh

set -e

echo "🚀 开始安装 AI 小说创作模块..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查依赖
echo "📋 检查依赖..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm 未安装，将使用 npm${NC}"
    PKG_MANAGER="npm"
else
    PKG_MANAGER="pnpm"
fi

echo -e "${GREEN}✅ 依赖检查完成${NC}"
echo ""

# 2. 环境变量配置
echo "⚙️  配置环境变量..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  已创建 .env 文件，请编辑以下配置：${NC}"
    echo "   - AUTH_SECRET"
    echo "   - OPENAI_API_KEY"
    echo ""
    read -p "按 Enter 继续（确保已配置）..."
else
    echo -e "${GREEN}✅ .env 文件已存在${NC}"
fi

# 检查必需的环境变量
if ! grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  请确保在 .env 中配置了 OPENAI_API_KEY${NC}"
fi

echo -e "${GREEN}✅ 环境变量配置完成${NC}"
echo ""

# 3. 安装 Python 后端依赖
echo "🐍 安装 Python 后端依赖..."

cd services/novel-backend

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

cd ../..

echo -e "${GREEN}✅ Python 依赖安装完成${NC}"
echo ""

# 4. 安装 Node.js 依赖
echo "📦 安装 Node.js 依赖..."

$PKG_MANAGER install

echo -e "${GREEN}✅ Node.js 依赖安装完成${NC}"
echo ""

# 5. 数据库迁移（使用直接 SQL 执行，避免 shadow database 权限问题）
echo "🗄️  执行数据库迁移..."

# 生成 Prisma Client
npx prisma generate

# 直接执行 SQL 迁移（跳过 Prisma Migrate）
echo "执行 SQL 迁移脚本..."
if [ -f "prisma/migrations/add_novel_module/migration.sql" ]; then
    # 从 .env 读取数据库连接信息
    DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)
    
    # 解析数据库连接信息
    # postgresql://user:password@host:port/database
    DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    echo "连接到数据库: $DB_HOST:$DB_PORT/$DB_NAME"
    
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
        -f prisma/migrations/add_novel_module/migration.sql \
        2>&1 | grep -v "already exists" || true
    
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
else
    echo -e "${YELLOW}⚠️  迁移脚本不存在，跳过${NC}"
fi

echo ""

# 6. 启动 Docker 服务
echo "🐳 启动 Docker 服务..."

docker-compose up -d novel-backend

echo "⏳ 等待服务启动..."
sleep 10

echo -e "${GREEN}✅ Docker 服务启动完成${NC}"
echo ""

# 7. 健康检查
echo "🏥 健康检查..."

if curl -f http://localhost:8000/health &> /dev/null; then
    echo -e "${GREEN}✅ Python 后端服务正常${NC}"
else
    echo -e "${YELLOW}⚠️  Python 后端服务未响应，请检查日志：docker-compose logs novel-backend${NC}"
fi

echo ""

# 8. 完成
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 AI 小说创作模块安装完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📚 下一步："
echo "   1. 启动 Next.js 开发服务器："
echo "      ${YELLOW}$PKG_MANAGER dev${NC}"
echo ""
echo "   2. 访问小说创作模块："
echo "      ${YELLOW}http://localhost:3000/novel${NC}"
echo ""
echo "   3. 查看 Python 后端 API 文档："
echo "      ${YELLOW}http://localhost:8000/docs${NC}"
echo ""
echo "📖 详细文档："
echo "   ${YELLOW}README_NOVEL_MODULE.md${NC}"
echo ""
echo "🐛 故障排查："
echo "   - 查看后端日志: ${YELLOW}docker-compose logs novel-backend${NC}"
echo "   - 查看所有服务: ${YELLOW}docker-compose ps${NC}"
echo "   - 重启服务: ${YELLOW}docker-compose restart novel-backend${NC}"
echo ""
