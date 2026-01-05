#!/bin/bash

# 小说封面功能 - 快速验证脚本

echo "🚀 小说封面功能验证脚本"
echo "================================"
echo ""

# 1. 检查数据库迁移
echo "1️⃣ 检查数据库迁移..."
npx tsx scripts/verify-migration.ts
if [ $? -eq 0 ]; then
  echo "✅ 数据库迁移验证通过"
else
  echo "❌ 数据库迁移验证失败"
  exit 1
fi

echo ""
echo "================================"
echo ""

# 2. 检查 Prisma Client
echo "2️⃣ 检查 Prisma Client 类型..."
if grep -q "cover_image" node_modules/@prisma/client/index.d.ts 2>/dev/null; then
  echo "✅ Prisma Client 已包含 cover_image 类型"
else
  echo "⚠️  Prisma Client 可能需要重新生成"
  echo "   运行: npx prisma generate"
fi

echo ""
echo "================================"
echo ""

# 3. 检查 API 文件
echo "3️⃣ 检查 API 端点..."
if [ -f "src/app/api/novel/projects/[id]/generate-cover/route.ts" ]; then
  echo "✅ API 端点文件存在"
else
  echo "❌ API 端点文件缺失"
  exit 1
fi

echo ""
echo "================================"
echo ""

# 4. 检查前端文件
echo "4️⃣ 检查前端实现..."
if grep -q "cover_image" "src/app/(novel)/novel/page.tsx" 2>/dev/null; then
  echo "✅ 前端已集成 cover_image"
else
  echo "❌ 前端未集成 cover_image"
  exit 1
fi

echo ""
echo "================================"
echo ""

# 5. 总结
echo "✅ 所有检查通过！"
echo ""
echo "📋 下一步操作："
echo "   1. 启动开发服务器: pnpm dev"
echo "   2. 访问小说列表: http://localhost:3000/novel"
echo "   3. 配置 LLM Providers (如果尚未配置):"
echo "      - prompt_optimizer"
echo "      - image_generation"
echo "   4. 悬停项目卡片，点击「生成封面」按钮测试"
echo ""
echo "📚 查看文档："
echo "   - docs/novel-cover-migration.md"
echo "   - docs/novel-cover-implementation-report.md"
echo ""
