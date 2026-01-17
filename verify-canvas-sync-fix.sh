#!/bin/bash

# 无限画布同步修复验证脚本
# 用法: ./verify-canvas-sync-fix.sh

set -e

echo "======================================"
echo "无限画布同步修复验证"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查函数
check_file() {
    local file=$1
    local pattern=$2
    local description=$3

    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        return 1
    fi
}

echo "1. 检查节点 Mutation 修复..."
echo "-----------------------------------"

check_file "src/components/InfiniteCanvas/nodes/ScriptNode.tsx" \
    "refetchQueries" \
    "ScriptNode 使用 refetchQueries"

check_file "src/components/InfiniteCanvas/nodes/ShotNode.tsx" \
    "refetchQueries" \
    "ShotNode 使用 refetchQueries"

check_file "src/components/InfiniteCanvas/nodes/SceneNode.tsx" \
    "refetchQueries" \
    "SceneNode 使用 refetchQueries"

check_file "src/components/InfiniteCanvas/nodes/FinalNode.tsx" \
    "refetchQueries" \
    "FinalNode 使用 refetchQueries"

echo ""
echo "2. 检查乐观更新逻辑..."
echo "-----------------------------------"

check_file "src/components/InfiniteCanvas/nodes/ScriptNode.tsx" \
    "script_status: 'completed'" \
    "ScriptNode onSuccess 更新为 completed"

check_file "src/components/InfiniteCanvas/nodes/ShotNode.tsx" \
    "shot_status: 'completed'" \
    "ShotNode onSuccess 更新为 completed"

check_file "src/components/InfiniteCanvas/nodes/SceneNode.tsx" \
    "scene_status: 'completed'" \
    "SceneNode onSuccess 更新为 completed"

check_file "src/components/InfiniteCanvas/nodes/FinalNode.tsx" \
    "final_status: 'completed'" \
    "FinalNode onSuccess 更新为 completed"

echo ""
echo "3. 检查字段映射..."
echo "-----------------------------------"

check_file "src/components/InfiniteCanvas/nodes/ScriptNode.tsx" \
    "script_segment_count" \
    "ScriptNode 使用正确字段 script_segment_count"

check_file "src/components/InfiniteCanvas/nodes/ShotNode.tsx" \
    "shot_count" \
    "ShotNode 使用正确字段 shot_count"

check_file "src/components/InfiniteCanvas/nodes/SceneNode.tsx" \
    "scene_image_count" \
    "SceneNode 使用正确字段 scene_image_count"

check_file "src/components/InfiniteCanvas/nodes/FinalNode.tsx" \
    "final_image_count" \
    "FinalNode 使用正确字段 final_image_count"

echo ""
echo "4. 检查调试日志..."
echo "-----------------------------------"

check_file "src/components/InfiniteCanvas/InfiniteCanvasView.tsx" \
    "timestamp: new Date().toISOString()" \
    "InfiniteCanvasView 包含详细时间戳日志"

echo ""
echo "5. 类型检查..."
echo "-----------------------------------"

if command -v tsc &> /dev/null; then
    echo -e "${YELLOW}运行 TypeScript 类型检查...${NC}"
    if npm run type-check 2>&1 | grep -q "Found 0 errors"; then
        echo -e "${GREEN}✓${NC} TypeScript 类型检查通过"
    else
        echo -e "${RED}✗${NC} TypeScript 类型检查失败"
        echo "请运行: npm run type-check"
    fi
else
    echo -e "${YELLOW}⚠${NC} TypeScript 未安装，跳过类型检查"
fi

echo ""
echo "6. 检查文档..."
echo "-----------------------------------"

if [ -f "CANVAS_SYNC_FIX.md" ]; then
    echo -e "${GREEN}✓${NC} 修复文档存在 (CANVAS_SYNC_FIX.md)"
else
    echo -e "${YELLOW}⚠${NC} 修复文档不存在"
fi

echo ""
echo "======================================"
echo "验证完成!"
echo "======================================"
echo ""
echo "下一步:"
echo "1. 启动开发服务器: npm run dev"
echo "2. 访问无限画布页面"
echo "3. 执行测试清单 (参见 CANVAS_SYNC_FIX.md)"
echo ""
echo "如有问题,请查看浏览器控制台日志:"
echo "  - [InfiniteCanvasView] Timeline 数据更新"
echo "  - [SSE] Connected to timeline updates"
echo ""
