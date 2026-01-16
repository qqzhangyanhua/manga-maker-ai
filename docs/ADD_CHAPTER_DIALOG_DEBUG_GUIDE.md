# AddChapterDialog 调试指南

## 问题描述

用户报告了两个问题：
1. **按钮仍然被禁用**：选择章节后，"添加"按钮仍然是 disabled 状态
2. **React Key 警告**：控制台显示 "Each child in a list should have a unique 'key' prop"

---

## 诊断步骤

### 问题 1：按钮禁用状态

**可能原因**：
1. `selectedChapterId` 没有正确更新
2. Select 组件的 `onValueChange` 没有触发
3. `chapter.id` 的类型与 `selectedChapterId` 不匹配

**添加的调试日志**：

```typescript
// 1. 监控章节加载
const loadChapters = async (projectId: string) => {
  // ...
  console.log("[AddChapterDialog] 加载章节成功", {
    projectId,
    chaptersCount: chapters.length,
    chapters: chapters.map(c => ({
      id: c.id,
      idType: typeof c.id,
      chapterNumber: c.chapterNumber,
      title: c.title,
    })),
  });
};

// 2. 监控章节选择变化
<Select
  value={selectedChapterId}
  onValueChange={(value) => {
    console.log("[AddChapterDialog] 章节选择变化", {
      newValue: value,
      valueType: typeof value,
      previousValue: selectedChapterId,
    });
    setSelectedChapterId(value);
  }}
>

// 3. 监控按钮状态
useEffect(() => {
  console.log("[AddChapterDialog] 按钮状态", {
    loading,
    selectedChapterId,
    selectedChapterIdEmpty: !selectedChapterId,
    buttonDisabled: loading || !selectedChapterId,
  });
}, [loading, selectedChapterId]);
```

### 问题 2：React Key 警告

**原因**：
- `chapter.id` 可能为 `undefined` 或 `null`
- 多个章节可能有相同的 `id`（虽然不太可能）

**修复方案**：

```typescript
// ❌ 修复前
chapters.map((chapter) => (
  <SelectItem key={chapter.id} value={chapter.id}>
    ...
  </SelectItem>
))

// ✅ 修复后（使用 fallback）
chapters.map((chapter, index) => (
  <SelectItem
    key={chapter.id || `chapter-${index}`}
    value={chapter.id}
  >
    ...
  </SelectItem>
))
```

---

## 调试流程

### 步骤 1：打开浏览器控制台

1. 按 `F12` 或右键 → "检查"
2. 切换到 "Console" 标签
3. 清空控制台（点击 🚫 图标）

### 步骤 2：操作流程

1. **点击"添加章节"按钮**
   - 预期日志：`[AddChapterDialog] Dialog 打开`（如果有的话）

2. **选择项目**
   - 预期日志：
     ```javascript
     [AddChapterDialog] 加载章节成功 {
       projectId: "4e5e17ed-5532-4bc1-9789-f8a92d2421a7",
       chaptersCount: 3,
       chapters: [
         { id: "abc123", idType: "string", chapterNumber: 1, title: "第1章" },
         { id: "def456", idType: "string", chapterNumber: 2, title: "第2章" },
         { id: "ghi789", idType: "string", chapterNumber: 3, title: "第3章" }
       ]
     }
     ```

3. **选择章节**
   - 预期日志：
     ```javascript
     [AddChapterDialog] 章节选择变化 {
       newValue: "abc123",
       valueType: "string",
       previousValue: ""
     }

     [AddChapterDialog] 按钮状态 {
       loading: false,
       selectedChapterId: "abc123",
       selectedChapterIdEmpty: false,
       buttonDisabled: false  // ✅ 应该是 false
     }
     ```

4. **点击"添加"按钮**
   - 预期日志：
     ```javascript
     [AddChapterDialog] handleAdd 开始执行 {
       selectedChapterId: "abc123",
       selectedChapterIdType: "string",
       chapters: [...]
     }

     [AddChapterDialog] 查找选中章节结果 {
       selectedChapterId: "abc123",
       selectedChapter: { id: "abc123", ... },
       found: true
     }

     [AddChapterDialog] 开始请求 API {
       url: "/api/canvas/timeline/.../chapters",
       payload: {
         chapter_id: "abc123",
         chapter_number: 1
       }
     }
     ```

---

## 常见问题诊断

### 问题 A：章节选择变化日志未出现

**症状**：选择章节时，控制台没有显示 `[AddChapterDialog] 章节选择变化`

**原因**：
1. Select 组件未正确绑定 `onValueChange`
2. `chapter.id` 为 `undefined`（导致 Select 无法识别选项）

**检查**：
```javascript
// 查看 loadChapters 的输出
// 如果某个 chapter 的 id 为 undefined：
{
  id: undefined,  // ❌ 问题所在
  idType: "undefined",
  chapterNumber: 1,
  title: "第1章"
}
```

**解决**：检查 API `/api/novel/projects/${projectId}/outlines` 的返回数据

### 问题 B：按钮状态显示 `buttonDisabled: true`

**症状**：即使 `selectedChapterId` 有值，`buttonDisabled` 仍然是 `true`

**检查日志**：
```javascript
[AddChapterDialog] 按钮状态 {
  loading: false,
  selectedChapterId: "abc123",  // ✅ 有值
  selectedChapterIdEmpty: false,  // ✅ 不为空
  buttonDisabled: true  // ❌ 但仍然是 true？
}
```

**原因**：代码逻辑错误（但当前代码应该不会出现此问题）

**解决**：检查 Button 的 `disabled` 属性：
```typescript
disabled={loading || !selectedChapterId}
```

### 问题 C：API 请求发送了 `{"chapter_id": "undefined"}`

**症状**：`handleAdd` 日志显示 `selectedChapterId: "undefined"`（字符串）

**原因**：
1. Select 返回的是字符串 `"undefined"` 而不是 `undefined`
2. API 返回的 `chapter.id` 本身就是字符串 `"undefined"`

**检查**：
```javascript
// 查看 loadChapters 输出
chapters: [
  { id: "undefined", ... }  // ❌ API 返回了错误数据
]
```

**解决**：修复后端 API，确保返回正确的 UUID

---

## 修复验证

### ✅ 成功标准

1. **无 React Key 警告**
   - 控制台没有 "Each child in a list should have a unique 'key' prop" 警告

2. **按钮状态正确**
   - 未选择章节时：按钮禁用（灰色，`cursor-not-allowed`）
   - 选择章节后：按钮可用（紫色，可点击）

3. **API 请求正确**
   ```json
   {
     "chapter_id": "真实的UUID（非undefined）",
     "chapter_number": 1
   }
   ```

4. **成功添加**
   - Toast 提示 "添加成功"
   - Dialog 自动关闭
   - 时间线刷新，新章节出现

### ❌ 失败排查

如果仍然失败，按以下优先级排查：

1. **API 数据格式**
   ```bash
   # 手动测试章节列表 API
   curl 'http://localhost:3000/api/novel/projects/{project_id}/outlines' \
     -H 'Cookie: comicai_session=YOUR_TOKEN'

   # 检查返回格式：
   {
     "outlines": [
       {
         "id": "应该是 UUID，不是 undefined",
         "chapterNumber": 1,
         "title": "章节标题"
       }
     ]
   }
   ```

2. **类型匹配**
   - 确认 `chapter.id` 类型：`console.log(typeof chapter.id)`
   - 确认 `selectedChapterId` 类型：`console.log(typeof selectedChapterId)`
   - 两者应该都是 `"string"`

3. **React Strict Mode**
   - 检查是否开启了 Strict Mode（会导致双重渲染）
   - 如果是，某些日志可能出现两次（正常现象）

---

## 代码变更总结

### 修改文件
- `src/components/InfiniteCanvas/AddChapterDialog.tsx`

### 变更内容

1. **添加章节加载日志** (76-95 行)
   ```typescript
   const loadChapters = async (projectId: string) => {
     // ... 加载逻辑
     console.log("[AddChapterDialog] 加载章节成功", { ... });
   };
   ```

2. **添加章节选择监听** (247-257 行)
   ```typescript
   <Select
     onValueChange={(value) => {
       console.log("[AddChapterDialog] 章节选择变化", { ... });
       setSelectedChapterId(value);
     }}
   >
   ```

3. **修复 React Key** (226-228, 266-268 行)
   ```typescript
   key={chapter.id || `chapter-${index}`}
   ```

4. **添加按钮状态监控** (53-60 行)
   ```typescript
   useEffect(() => {
     console.log("[AddChapterDialog] 按钮状态", { ... });
   }, [loading, selectedChapterId]);
   ```

5. **修复按钮禁用逻辑** (295 行)
   ```typescript
   disabled={loading || !selectedChapterId}
   ```

---

## 清理调试代码（可选）

**生产环境部署前**，可以移除所有 `console.log` 调试语句：

```bash
# 搜索所有调试日志
grep -n "console.log.*AddChapterDialog" src/components/InfiniteCanvas/AddChapterDialog.tsx

# 或使用 VSCode 全局搜索：
# Ctrl+Shift+F → 搜索 "console.log.*AddChapterDialog"
```

**建议**：保留关键错误日志，仅移除详细调试日志

---

**修复时间**: 2026-01-16
**修复状态**: ✅ 调试工具已就绪
**下一步**: 刷新页面，查看控制台日志，根据输出诊断具体问题
