#!/bin/bash

# 设计方案快速应用脚本
# 使用方式: bash apply-design.sh [vercel|linear|apple]

set -e

STYLE=$1

if [ -z "$STYLE" ]; then
    echo "请指定风格: vercel, linear, 或 apple"
    echo "使用方式: bash apply-design.sh [vercel|linear|apple]"
    exit 1
fi

echo "正在应用 $STYLE 风格..."

# 备份当前文件
echo "1. 备份当前文件..."
cp src/app/scripts/page.tsx src/app/scripts/page.tsx.backup.$(date +%Y%m%d%H%M%S)
echo "   ✓ 已备份 scripts/page.tsx"

# 应用新设计
echo "2. 应用新设计..."
case $STYLE in
    vercel)
        cp design-proposals/vercel-style-scripts.tsx src/app/scripts/page.tsx
        echo "   ✓ 已应用 Vercel 风格"
        ;;
    linear)
        cp design-proposals/linear-style-scripts.tsx src/app/scripts/page.tsx
        echo "   ✓ 已应用 Linear 风格"
        ;;
    apple)
        cp design-proposals/apple-style-scripts.tsx src/app/scripts/page.tsx
        echo "   ✓ 已应用 Apple 风格"
        ;;
    *)
        echo "❌ 未知风格: $STYLE"
        echo "请选择: vercel, linear, 或 apple"
        exit 1
        ;;
esac

echo ""
echo "✅ 设计方案应用成功!"
echo ""
echo "下一步:"
echo "1. 启动开发服务器: pnpm dev"
echo "2. 访问 http://localhost:3000/scripts 查看效果"
echo "3. 如需回滚，备份文件位于: src/app/scripts/page.tsx.backup.*"
echo ""
