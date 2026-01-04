# 🔧 API 代理层修复报告

## 🐛 问题描述

### 错误信息
```json
{
    "error": "Internal Server Error",
    "message": "Body is unusable: Body has already been read"
}
```

### 触发接口
- `POST /api/novel/inspiration/start`
- 以及其他所有 POST/PUT/PATCH 请求

### 根本原因
在 `src/app/api/novel/[...path]/route.ts` 中，请求体被读取了两次：

```typescript
// ❌ 错误的代码
try {
  const jsonBody = await req.json();  // 第一次读取
  body = JSON.stringify(jsonBody);
} catch {
  body = await req.text();  // 第二次读取（失败）
}
```

**问题**：Next.js 的 `Request` 对象的 body 只能读取一次。一旦调用 `req.json()` 或 `req.text()`，body 就被消费了，无法再次读取。

---

## ✅ 修复方案

### 修复代码
```typescript
// ✅ 正确的代码
// 检查 Content-Type 来决定如何读取
const contentType = req.headers.get("content-type");

if (contentType?.includes("application/json")) {
  try {
    const jsonBody = await req.json();
    body = JSON.stringify(jsonBody);
  } catch (error) {
    console.error("[Novel API Proxy] Failed to parse JSON:", error);
    body = JSON.stringify({});
  }
} else {
  // 非 JSON 内容，读取为文本
  try {
    body = await req.text();
  } catch (error) {
    console.error("[Novel API Proxy] Failed to read body:", error);
  }
}
```

### 修复原理
1. **先检查 Content-Type**：根据请求头判断内容类型
2. **只读取一次**：根据类型选择 `req.json()` 或 `req.text()`，只调用一次
3. **错误处理**：如果读取失败，使用默认值而不是尝试其他方法

---

## 📦 修改的文件

```
🔧 src/app/api/novel/[...path]/route.ts (第 76-86 行)
```

---

## 🧪 验证步骤

### 1. 测试灵感模式启动
```bash
# 前端测试
1. 打开浏览器访问 http://localhost:3000/novel
2. 点击"灵感模式"按钮
3. 点击"开始创作"
4. 验证是否正常显示第一个问题
```

### 2. 测试其他 POST 接口
```bash
# 创建项目
POST /api/novel/projects
{
  "title": "测试项目",
  "description": "测试描述"
}

# 生成章节
POST /api/novel/chapters
{
  "project_id": "...",
  "chapter_number": 1,
  "title": "第一章"
}
```

### 3. 检查日志
```bash
# 查看 Next.js 控制台
# 应该看到：
[Novel API Proxy] POST http://localhost:8000/api/novel/inspiration/start

# 不应该看到错误：
Body is unusable: Body has already been read
```

---

## 🎯 预期结果

### 修复前 ❌
```json
{
  "error": "Internal Server Error",
  "message": "Body is unusable: Body has already been read"
}
```

### 修复后 ✅
```json
{
  "session_id": "uuid-string",
  "step": 1,
  "question": "你想写什么类型的故事？",
  "type": "choice",
  "options": ["玄幻", "科幻", "现代", ...],
  "hint": "选择一个最符合你想法的类型"
}
```

---

## 📝 技术说明

### Next.js Request Body 读取规则

1. **只能读取一次**
   ```typescript
   const body1 = await req.json();  // ✅ 成功
   const body2 = await req.json();  // ❌ 抛出错误
   ```

2. **读取方法互斥**
   ```typescript
   const json = await req.json();   // ✅ 成功
   const text = await req.text();   // ❌ 抛出错误
   ```

3. **正确的做法**
   ```typescript
   // 方案 1: 根据 Content-Type 选择
   const contentType = req.headers.get("content-type");
   if (contentType?.includes("application/json")) {
     const body = await req.json();
   } else {
     const body = await req.text();
   }
   
   // 方案 2: 使用 clone()
   const clonedReq = req.clone();
   try {
     const body = await req.json();
   } catch {
     const body = await clonedReq.text();
   }
   ```

### 为什么不使用 clone()？

虽然 `req.clone()` 可以解决问题，但：
- 增加内存开销（复制整个请求）
- 不必要（我们知道 Content-Type）
- 性能较差

因此，我们选择根据 Content-Type 判断的方案。

---

## 🚀 影响范围

### 受益的接口
所有 POST/PUT/PATCH 请求都受益于此修复：

1. **灵感模式**
   - `POST /api/novel/inspiration/start`
   - `POST /api/novel/inspiration/next`
   - `POST /api/novel/inspiration/generate`
   - `POST /api/novel/inspiration/create-project`

2. **项目管理**
   - `POST /api/novel/projects`
   - `PATCH /api/novel/projects/{id}`
   - `PUT /api/novel/projects/{id}/outlines`
   - `POST /api/novel/projects/{id}/generate-outline`

3. **章节管理**
   - `POST /api/novel/chapters`
   - `PATCH /api/novel/chapters/{id}`
   - `POST /api/novel/chapters/revise`

4. **其他功能**
   - 所有需要请求体的 API

---

## ✅ 验收标准

- [x] 修复代码已提交
- [ ] 灵感模式正常启动
- [ ] 创建项目正常工作
- [ ] 生成章节正常工作
- [ ] 所有 POST 接口正常工作
- [ ] 控制台无错误日志

---

## 📚 相关文档

- Next.js Request API: https://nextjs.org/docs/app/api-reference/functions/next-request
- Web Streams API: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
- Fetch API Body: https://developer.mozilla.org/en-US/docs/Web/API/Request/body

---

**修复状态**: ✅ **已完成**

**修复时间**: 2026-01-04

**影响范围**: 所有 POST/PUT/PATCH 请求

**测试状态**: ⏳ **待验证**
