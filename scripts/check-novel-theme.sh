#!/bin/bash

# 小说模块主题色验证脚本
# 用于快速检查是否还有遗漏的主题色统一问题

echo "🔍 开始检查小说模块主题色..."
echo ""

NOVEL_DIR="/Users/zhangyanhua/AI/manga-maker-ai/src/app/(novel)/novel"

# 1. 检查是否所有页面都引入了 novel-theme.css
echo "📄 检查页面级别的 CSS 引入..."
PAGES=(
  "$NOVEL_DIR/page.tsx"
  "$NOVEL_DIR/[id]/page.tsx"
  "$NOVEL_DIR/canvas/[id]/page.tsx"
)

for page in "${PAGES[@]}"; do
  if grep -q "novel-theme.css" "$page"; then
    echo "  ✅ $(basename $(dirname $page))/$(basename $page)"
  else
    echo "  ❌ $(basename $(dirname $page))/$(basename $page) - 未引入 novel-theme.css"
  fi
done
echo ""

# 2. 检查是否所有页面都添加了 novel-theme-scope
echo "📦 检查页面级别的作用域..."
for page in "${PAGES[@]}"; do
  if grep -q "novel-theme-scope" "$page"; then
    echo "  ✅ $(basename $(dirname $page))/$(basename $page)"
  else
    echo "  ❌ $(basename $(dirname $page))/$(basename $page) - 未添加 novel-theme-scope"
  fi
done
echo ""

# 3. 统计仍在使用 bg-primary 的组件
echo "🎨 统计使用 bg-primary 的组件..."
BG_PRIMARY_COUNT=$(grep -r "bg-primary" "$NOVEL_DIR" --include="*.tsx" --exclude-dir=node_modules | wc -l | xargs)
TEXT_PRIMARY_COUNT=$(grep -r "text-primary" "$NOVEL_DIR" --include="*.tsx" --exclude-dir=node_modules | wc -l | xargs)
echo "  bg-primary 使用次数: $BG_PRIMARY_COUNT"
echo "  text-primary 使用次数: $TEXT_PRIMARY_COUNT"
echo "  (这些会自动变为紫色 #933EEA)"
echo ""

# 4. 检查是否还有硬编码的橙色主题
echo "⚠️  检查硬编码的橙色样式..."
ORANGE_PATTERNS=(
  "bg-orange-500[^/]"
  "text-orange-500[^/]"
  "border-orange-500[^/]"
)

FOUND_ORANGE=false
for pattern in "${ORANGE_PATTERNS[@]}"; do
  matches=$(grep -r -E "$pattern" "$NOVEL_DIR" --include="*.tsx" --exclude-dir=node_modules 2>/dev/null)
  if [ ! -z "$matches" ]; then
    FOUND_ORANGE=true
    echo "  ⚠️  发现橙色样式: $pattern"
    echo "$matches" | head -3
    echo ""
  fi
done

if [ "$FOUND_ORANGE" = false ]; then
  echo "  ✅ 未发现硬编码的橙色主题"
fi
echo ""

# 5. 检查 theme.ts 是否使用 purple-600
echo "🎯 检查 theme.ts 配置..."
if grep -q "bg-purple-600" "$NOVEL_DIR/theme.ts"; then
  echo "  ✅ theme.ts 使用 purple-600"
else
  echo "  ❌ theme.ts 未使用 purple-600"
fi
echo ""

# 6. 检查 novel-theme.css 是否存在
echo "📝 检查 CSS 文件..."
if [ -f "$NOVEL_DIR/novel-theme.css" ]; then
  echo "  ✅ novel-theme.css 存在"
  if grep -q "271 80% 58%" "$NOVEL_DIR/novel-theme.css"; then
    echo "  ✅ CSS 变量配置正确 (HSL: 271 80% 58% = #933EEA)"
  else
    echo "  ❌ CSS 变量配置错误"
  fi
else
  echo "  ❌ novel-theme.css 不存在"
fi
echo ""

echo "========================================"
echo "✅ 检查完成！"
echo ""
echo "📋 下一步："
echo "1. 运行 'npm run dev' 启动开发服务器"
echo "2. 访问 http://localhost:3000/novel"
echo "3. 检查主按钮、Tab、图标是否为紫色"
echo "4. 确认语义色（红/绿/蓝）保持原样"
echo ""
echo "📄 完整报告: src/app/(novel)/novel/THEME_AUDIT_REPORT.md"
echo "========================================"
