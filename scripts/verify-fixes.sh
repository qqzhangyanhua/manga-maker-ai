#!/bin/bash

# 代码修复验证脚本
# 用于验证 P0 和 P1 修复是否成功

echo "🔍 开始验证代码修复..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0

# 1. 检查 TypeScript 编译
echo "📝 检查 TypeScript 编译..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ TypeScript 编译失败${NC}"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ TypeScript 编译通过${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 2. 检查 ESLint
echo "🔍 检查 ESLint..."
LINT_ERRORS=$(npm run lint 2>&1 | grep -c "Error:")
if [ "$LINT_ERRORS" -gt 0 ]; then
    echo -e "${RED}❌ 发现 $LINT_ERRORS 个 ESLint 错误${NC}"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ ESLint 检查通过 (无错误)${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 3. 检查新增文件是否存在
echo "📁 检查新增文件..."
FILES=(
    "src/app/scripts/[id]/types/domain.types.ts"
    "src/app/scripts/[id]/types/component-props.types.ts"
    "src/app/scripts/[id]/utils/inputValidation.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ $file 不存在${NC}"
        FAILED=$((FAILED + 1))
    fi
done
echo ""

# 4. 检查输入验证函数
echo "🔐 检查输入验证实现..."
if grep -q "validateBackgroundParams" "src/app/scripts/[id]/utils/inputValidation.ts"; then
    echo -e "${GREEN}✅ validateBackgroundParams 函数已实现${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ validateBackgroundParams 函数未找到${NC}"
    FAILED=$((FAILED + 1))
fi

if grep -q "sanitizeString" "src/app/scripts/[id]/utils/inputValidation.ts"; then
    echo -e "${GREEN}✅ sanitizeString 函数已实现${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ sanitizeString 函数未找到${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# 5. 检查主页面是否使用了验证
echo "🔗 检查主页面集成..."
if grep -q "validateBackgroundParams" "src/app/scripts/[id]/page.tsx"; then
    echo -e "${GREEN}✅ 主页面已集成输入验证${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 主页面未集成输入验证${NC}"
    FAILED=$((FAILED + 1))
fi

if grep -q "ValidationError" "src/app/scripts/[id]/page.tsx"; then
    echo -e "${GREEN}✅ 主页面已导入 ValidationError${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 主页面未导入 ValidationError${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# 6. 检查类型断言移除
echo "🎯 检查类型断言..."
AS_NEVER_COUNT=$(grep -c "as never" "src/app/scripts/[id]/components/ScriptPageTabs.tsx" 2>/dev/null || echo "0")
if [ "$AS_NEVER_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ ScriptPageTabs 已移除 'as never' 断言${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  ScriptPageTabs 仍有 $AS_NEVER_COUNT 个 'as never' 断言${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 验证结果总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 通过: $PASSED${NC}"
echo -e "${RED}❌ 失败: $FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查通过!代码修复成功!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  发现 $FAILED 个问题,请检查并修复${NC}"
    exit 1
fi
