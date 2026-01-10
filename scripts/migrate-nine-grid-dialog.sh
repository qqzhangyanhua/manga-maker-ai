#!/bin/bash

# 九宫格对话框重构迁移脚本
# 用途：快速切换到重构后的版本

set -e

COMPONENT_DIR="src/app/scripts/[id]/components"
BACKUP_SUFFIX=".backup.$(date +%Y%m%d_%H%M%S)"

echo "🚀 开始迁移 NineGridDialog 到重构版本..."
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误: 请在项目根目录运行此脚本"
  exit 1
fi

# 检查重构文件是否存在
if [ ! -f "$COMPONENT_DIR/NineGridDialog.refactored.tsx" ]; then
  echo "❌ 错误: 未找到重构文件 NineGridDialog.refactored.tsx"
  exit 1
fi

echo "📋 迁移计划:"
echo "  1. 备份原文件 → NineGridDialog.tsx${BACKUP_SUFFIX}"
echo "  2. 重命名重构文件 → NineGridDialog.tsx"
echo "  3. 验证文件完整性"
echo ""

read -p "是否继续? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 迁移已取消"
  exit 0
fi

echo ""
echo "📦 步骤 1: 备份原文件..."
cp "$COMPONENT_DIR/NineGridDialog.tsx" "$COMPONENT_DIR/NineGridDialog.tsx${BACKUP_SUFFIX}"
echo "✅ 备份完成: NineGridDialog.tsx${BACKUP_SUFFIX}"

echo ""
echo "🔄 步骤 2: 替换为重构版本..."
mv "$COMPONENT_DIR/NineGridDialog.refactored.tsx" "$COMPONENT_DIR/NineGridDialog.tsx"
echo "✅ 替换完成"

echo ""
echo "🔍 步骤 3: 验证文件..."

# 检查必要的文件是否存在
REQUIRED_FILES=(
  "$COMPONENT_DIR/NineGridDialog.tsx"
  "$COMPONENT_DIR/NineGridDialog.types.ts"
  "$COMPONENT_DIR/NineGridDialog.constants.ts"
  "$COMPONENT_DIR/useNineGridData.ts"
  "$COMPONENT_DIR/usePanelSelection.ts"
  "$COMPONENT_DIR/PanelSelector.tsx"
  "$COMPONENT_DIR/nineGridApi.ts"
)

ALL_EXISTS=true
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (缺失)"
    ALL_EXISTS=false
  fi
done

echo ""
if [ "$ALL_EXISTS" = true ]; then
  echo "🎉 迁移成功完成!"
  echo ""
  echo "📝 后续步骤:"
  echo "  1. 运行 pnpm dev 启动开发服务器"
  echo "  2. 测试九宫格对话框功能"
  echo "  3. 如有问题，可以恢复备份:"
  echo "     cp $COMPONENT_DIR/NineGridDialog.tsx${BACKUP_SUFFIX} $COMPONENT_DIR/NineGridDialog.tsx"
  echo ""
  echo "📚 查看重构文档:"
  echo "  - $COMPONENT_DIR/REFACTORING_GUIDE.md"
  echo "  - $COMPONENT_DIR/REFACTORING_SUMMARY.md"
else
  echo "⚠️  警告: 部分文件缺失，请检查重构是否完整"
  exit 1
fi
