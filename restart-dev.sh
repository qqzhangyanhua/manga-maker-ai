#!/bin/bash

echo "🔄 重启开发服务器..."
echo ""

# 1. 查找并停止现有的 dev 进程
echo "1️⃣ 停止现有开发服务器..."
pkill -f "pnpm dev" || pkill -f "npm run dev" || pkill -f "next dev"
sleep 2

# 2. 清除缓存
echo "2️⃣ 清除缓存..."
rm -rf .next
rm -rf node_modules/.cache
find node_modules/.pnpm -name ".prisma" -type d -exec rm -rf {} + 2>/dev/null || true

# 3. 重新生成 Prisma Client
echo "3️⃣ 重新生成 Prisma Client..."
npx prisma generate

# 4. 启动开发服务器
echo "4️⃣ 启动开发服务器..."
echo ""
echo "✅ 准备完成！现在运行："
echo "   pnpm dev"
echo ""
