#!/bin/bash

# 漫画风格 AI 图片生成功能测试脚本

echo "========================================="
echo "漫画风格 AI 图片生成功能测试"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试 API 是否存在
echo "1. 测试 API 路由是否存在..."
if [ -f "src/app/api/image-generation/route.ts" ]; then
    echo -e "${GREEN}✓ API 路由文件存在${NC}"
else
    echo -e "${RED}✗ API 路由文件不存在${NC}"
    exit 1
fi

# 检查类型错误
echo ""
echo "2. 检查 TypeScript 类型错误..."
npx tsc --noEmit src/app/api/image-generation/route.ts 2>&1 | grep -E "error TS" | grep -v "node_modules" | head -5
if [ $? -eq 0 ]; then
    echo -e "${RED}✗ 发现类型错误${NC}"
else
    echo -e "${GREEN}✓ 无类型错误${NC}"
fi

# 检查前端组件
echo ""
echo "3. 检查前端组件..."
if [ -f "src/app/admin/comic-styles/page.tsx" ]; then
    echo -e "${GREEN}✓ 主页面组件存在${NC}"
    
    # 检查是否包含 AI 生成功能
    if grep -q "handleGenerateImage" "src/app/admin/comic-styles/page.tsx"; then
        echo -e "${GREEN}✓ 包含 AI 生成处理函数${NC}"
    else
        echo -e "${RED}✗ 缺少 AI 生成处理函数${NC}"
    fi
    
    if grep -q "Sparkles" "src/app/admin/comic-styles/page.tsx"; then
        echo -e "${GREEN}✓ 包含 Sparkles 图标${NC}"
    else
        echo -e "${RED}✗ 缺少 Sparkles 图标${NC}"
    fi
else
    echo -e "${RED}✗ 主页面组件不存在${NC}"
fi

# 检查 Hook
echo ""
echo "4. 检查表单 Hook..."
if [ -f "src/app/admin/comic-styles/hooks/useComicStyleForm.ts" ]; then
    echo -e "${GREEN}✓ 表单 Hook 存在${NC}"
    
    if grep -q "handleGenerateImage" "src/app/admin/comic-styles/hooks/useComicStyleForm.ts"; then
        echo -e "${GREEN}✓ 包含 handleGenerateImage 函数${NC}"
    else
        echo -e "${RED}✗ 缺少 handleGenerateImage 函数${NC}"
    fi
    
    if grep -q "generating" "src/app/admin/comic-styles/hooks/useComicStyleForm.ts"; then
        echo -e "${GREEN}✓ 包含 generating 状态${NC}"
    else
        echo -e "${RED}✗ 缺少 generating 状态${NC}"
    fi
else
    echo -e "${RED}✗ 表单 Hook 不存在${NC}"
fi

# 检查文档
echo ""
echo "5. 检查文档..."
if [ -f "docs/COMIC_STYLE_AI_GENERATION.md" ]; then
    echo -e "${GREEN}✓ 功能文档存在${NC}"
else
    echo -e "${YELLOW}⚠ 功能文档不存在${NC}"
fi

# 运行 ESLint
echo ""
echo "6. 运行 ESLint 检查..."
npm run lint 2>&1 | grep -E "(comic-styles|image-generation)" | head -10
if [ $? -eq 0 ]; then
    echo -e "${YELLOW}⚠ 发现 Lint 警告或错误${NC}"
else
    echo -e "${GREEN}✓ 无 Lint 错误${NC}"
fi

echo ""
echo "========================================="
echo "测试完成!"
echo "========================================="
echo ""
echo "下一步:"
echo "1. 启动开发服务器: npm run dev"
echo "2. 访问: http://localhost:3000/admin/comic-styles"
echo "3. 测试单个生成功能"
echo "4. 测试批量生成功能"
echo ""
