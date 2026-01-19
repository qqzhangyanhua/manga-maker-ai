#!/bin/bash
# 测试后端 API 是否返回 chapters

echo "正在测试后端 API..."
echo ""

# 需要一个有效的 JWT token
# 从浏览器控制台获取 token:
# 1. 打开浏览器开发者工具
# 2. 在 Console 中运行: document.cookie
# 3. 找到 comicai_session 的值

# 如果你有 token，取消下面这行的注释并替换 YOUR_TOKEN
# TOKEN="YOUR_TOKEN"

# 临时方案：直接访问后端（绕过认证，仅测试）
echo "测试 1: 检查后端健康状态"
curl -s http://localhost:8000/health | python3 -m json.tool
echo ""

echo "测试 2: 尝试访问项目 API（需要认证）"
echo "注意：这会返回 401 错误，因为没有有效 token"
curl -s http://localhost:8000/projects/19332382-ee75-4e08-9ec0-a7834063432c \
  2>&1 | python3 -m json.tool | head -20
echo ""

echo "===== 手动测试步骤 ====="
echo "1. 在浏览器中打开开发者工具 (F12)"
echo "2. 切换到 Network 标签"
echo "3. 刷新页面"
echo "4. 找到 'projects/19332382...' 的请求"
echo "5. 查看 Response 标签中的数据"
echo "6. 检查是否有 'chapters' 字段"
echo ""
echo "如果 Response 中有 'chapters: null' 或 'chapters: []',"
echo "说明数据库中确实没有章节数据。"
