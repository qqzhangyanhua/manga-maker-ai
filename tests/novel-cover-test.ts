/**
 * 测试小说封面生成功能
 *
 * 测试步骤：
 * 1. 启动开发服务器: pnpm dev
 * 2. 确保数据库已添加 cover_image 字段
 * 3. 在浏览器中访问小说列表页面 /novel
 * 4. 鼠标悬停在项目卡片上，点击"生成封面"按钮
 * 5. 检查封面是否成功生成并显示
 *
 * 手动数据库迁移（如果 prisma db push 失败）：
 *
 * 在数据库中手动执行：
 * ALTER TABLE novel_projects ADD COLUMN IF NOT EXISTS cover_image TEXT;
 *
 * 或者使用 Prisma Studio:
 * npx prisma studio
 *
 * API端点：
 * POST /api/novel/projects/[id]/generate-cover
 *
 * 请求体：
 * {
 *   "customPrompt": "可选的自定义提示词"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "cover_url": "http://...",
 *   "prompt": "使用的提示词",
 *   "project": { ... }
 * }
 */

// 测试用例：使用 curl 测试API
// 替换 PROJECT_ID 为实际的项目ID
const testCurl = `
curl -X POST http://localhost:3000/api/novel/projects/PROJECT_ID/generate-cover \\
  -H "Content-Type: application/json" \\
  -H "Cookie: comicai_session=YOUR_SESSION_TOKEN" \\
  -d '{}'
`;

console.log("测试说明已生成");
console.log(testCurl);

export {};
