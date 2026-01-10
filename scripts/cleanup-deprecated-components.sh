#!/bin/bash

# 废弃组件清理脚本
# 用于安全删除已确认废弃的组件

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗑️  废弃组件清理工具${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 基础路径
BASE_PATH="src/app/scripts/[id]/components"

# 确认废弃的组件列表
DEPRECATED_COMPONENTS=(
  "ChapterList.tsx"
  "ChapterItem.tsx"
  "ChapterDialogs.tsx"
  "DialogManager.tsx"
  "SerialTab.tsx"
  "StoryInfoPanel.tsx"
  "PanelListView.tsx"
)

# 可能废弃的组件 (需要用户确认)
MAYBE_DEPRECATED=(
  "PanelSelector.tsx"
  "ReferenceImageSelector.tsx"
  "MultiPanelGenerateDialog.tsx"
)

# 统计
DELETED_COUNT=0
SKIPPED_COUNT=0
TOTAL_SIZE=0

# 检查 Git 状态
echo -e "${YELLOW}📋 检查 Git 状态...${NC}"
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${RED}⚠️  警告: 工作目录有未提交的更改${NC}"
    echo -e "${YELLOW}建议先提交或暂存更改再运行此脚本${NC}"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ 已取消${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✅ Git 状态正常${NC}"
echo ""

# 显示将要删除的文件
echo -e "${YELLOW}📝 将要删除以下确认废弃的组件:${NC}"
echo ""
for component in "${DEPRECATED_COMPONENTS[@]}"; do
  if [ -f "$BASE_PATH/$component" ]; then
    SIZE=$(wc -l < "$BASE_PATH/$component" | tr -d ' ')
    echo -e "  ${RED}❌${NC} $component (${SIZE} 行)"
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
  else
    echo -e "  ${YELLOW}⚠️${NC}  $component (未找到)"
  fi
done

echo ""
echo -e "${BLUE}总计: ${#DEPRECATED_COMPONENTS[@]} 个文件, 约 ${TOTAL_SIZE} 行代码${NC}"
echo ""

# 确认删除
read -p "确认删除这些文件? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 已取消${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 开始删除...${NC}"
echo ""

# 删除确认废弃的组件
for component in "${DEPRECATED_COMPONENTS[@]}"; do
  FILE_PATH="$BASE_PATH/$component"
  if [ -f "$FILE_PATH" ]; then
    echo -e "${YELLOW}删除:${NC} $component"
    rm "$FILE_PATH"
    DELETED_COUNT=$((DELETED_COUNT + 1))
  else
    echo -e "${YELLOW}跳过:${NC} $component (文件不存在)"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  fi
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 确认废弃的组件清理完成!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📊 统计:"
echo -e "  ✅ 已删除: ${GREEN}${DELETED_COUNT}${NC} 个文件"
echo -e "  ⚠️  跳过: ${YELLOW}${SKIPPED_COUNT}${NC} 个文件"
echo -e "  📉 减少代码: ${BLUE}~${TOTAL_SIZE}${NC} 行"
echo ""

# 询问是否处理可能废弃的组件
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  可能废弃的组件${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "以下组件可能已废弃,但需要进一步确认:"
echo ""
for component in "${MAYBE_DEPRECATED[@]}"; do
  if [ -f "$BASE_PATH/$component" ]; then
    SIZE=$(wc -l < "$BASE_PATH/$component" | tr -d ' ')
    echo -e "  ${YELLOW}⚠️${NC}  $component (${SIZE} 行)"
  fi
done
echo ""
read -p "是否也删除这些可能废弃的组件? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}删除可能废弃的组件...${NC}"
  for component in "${MAYBE_DEPRECATED[@]}"; do
    FILE_PATH="$BASE_PATH/$component"
    if [ -f "$FILE_PATH" ]; then
      echo -e "${YELLOW}删除:${NC} $component"
      rm "$FILE_PATH"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
  done
  echo -e "${GREEN}✅ 可能废弃的组件也已删除${NC}"
else
  echo -e "${BLUE}ℹ️  保留可能废弃的组件,请手动确认后再删除${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 下一步操作${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. 运行 Lint 检查:"
echo -e "   ${GREEN}npm run lint${NC}"
echo ""
echo "2. 运行构建测试:"
echo -e "   ${GREEN}npm run build${NC}"
echo ""
echo "3. 提交更改:"
echo -e "   ${GREEN}git add .${NC}"
echo -e "   ${GREEN}git commit -m \"chore: 移除废弃组件\"${NC}"
echo ""
echo "4. 如果遇到问题,可以回滚:"
echo -e "   ${YELLOW}git checkout -- $BASE_PATH${NC}"
echo ""

# 询问是否自动运行 lint
read -p "是否现在运行 npm run lint? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BLUE}🔍 运行 Lint 检查...${NC}"
  if npm run lint; then
    echo -e "${GREEN}✅ Lint 检查通过!${NC}"
  else
    echo -e "${RED}❌ Lint 检查失败,请检查错误${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}🎉 清理完成!${NC}"
