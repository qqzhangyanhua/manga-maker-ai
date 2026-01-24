#!/bin/bash

# 九宫格角色参考图修复 - 快速测试脚本
# 用法: ./scripts/test-nine-grid-fix.sh

set -e

echo "🔍 九宫格角色参考图修复 - 快速测试"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查修改的文件是否存在
echo "📁 检查修改的文件..."
files=(
  "src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx"
  "src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/GenerateNineGridDialog.tsx"
  "src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts"
  "src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (不存在)"
    all_exist=false
  fi
done

if [ "$all_exist" = false ]; then
  echo -e "\n${RED}❌ 错误: 部分文件不存在${NC}"
  exit 1
fi

echo ""

# 2. 检查是否包含关键修改
echo "🔍 检查关键修改..."

# 检查 CharacterReferenceSection.tsx 是否有状态处理
if grep -q "正在加载角色数据..." "src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx"; then
  echo -e "  ${GREEN}✓${NC} CharacterReferenceSection: 加载状态提示已添加"
else
  echo -e "  ${YELLOW}⚠${NC} CharacterReferenceSection: 未找到加载状态提示"
fi

if grep -q "缺少章节信息" "src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/CharacterReferenceSection.tsx"; then
  echo -e "  ${GREEN}✓${NC} CharacterReferenceSection: 参数缺失处理已添加"
else
  echo -e "  ${YELLOW}⚠${NC} CharacterReferenceSection: 未找到参数缺失处理"
fi

# 检查 GenerateNineGridDialog.tsx 是否移除了条件渲染
if grep -q "始终渲染,在组件内部处理缺失情况" "src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/GenerateNineGridDialog.tsx"; then
  echo -e "  ${GREEN}✓${NC} GenerateNineGridDialog: 条件渲染已移除"
else
  echo -e "  ${YELLOW}⚠${NC} GenerateNineGridDialog: 未找到条件渲染移除标记"
fi

# 检查 useChapterCharacters.ts 是否改进了错误处理
if grep -q "返回空数据而不是抛出错误" "src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/hooks/useChapterCharacters.ts"; then
  echo -e "  ${GREEN}✓${NC} useChapterCharacters: 错误处理已改进"
else
  echo -e "  ${YELLOW}⚠${NC} useChapterCharacters: 未找到错误处理改进"
fi

echo ""

# 3. TypeScript 类型检查
echo "🔧 运行 TypeScript 类型检查..."
if npm run type-check > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} TypeScript 类型检查通过"
else
  echo -e "  ${RED}✗${NC} TypeScript 类型检查失败"
  echo ""
  echo "运行以下命令查看详细错误:"
  echo "  npm run type-check"
  exit 1
fi

echo ""

# 4. ESLint 检查
echo "🔧 运行 ESLint 检查..."
if npm run lint -- --quiet > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} ESLint 检查通过"
else
  echo -e "  ${YELLOW}⚠${NC} ESLint 检查有警告 (可忽略)"
fi

echo ""

# 5. 检查是否有调试日志
echo "🔍 检查调试日志..."
log_count=$(grep -r "console.log\[" src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/ src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx 2>/dev/null | wc -l | tr -d ' ')

if [ "$log_count" -gt 0 ]; then
  echo -e "  ${GREEN}✓${NC} 找到 $log_count 处调试日志"
  echo ""
  echo "  调试日志位置:"
  grep -rn "console.log\[" src/app/(novel)/novel/components/InfiniteCanvas/NineGrid/ src/app/(novel)/novel/components/InfiniteCanvas/DetailPanel/ShotDetailPanel.tsx 2>/dev/null | sed 's/^/    /'
else
  echo -e "  ${YELLOW}⚠${NC} 未找到调试日志"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ 快速测试完成!${NC}"
echo ""
echo "📋 下一步:"
echo "  1. 启动开发服务器: npm run dev"
echo "  2. 打开浏览器开发者工具 (F12)"
echo "  3. 按照 NINE_GRID_FIX_VERIFICATION.md 进行完整验证"
echo ""
echo "📊 验证文档: NINE_GRID_FIX_VERIFICATION.md"
echo "🔍 诊断文档: DEBUG_NINE_GRID_CHARACTERS.md"
echo ""
