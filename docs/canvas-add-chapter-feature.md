# 无限画布添加章节功能

## 🎯 问题描述

用户反馈:**无限画布页面缺少添加章节的入口**

虽然后端 API (`/api/canvas/timeline/[id]/chapters`) 已经实现,但前端 UI 没有提供添加章节的按钮和对话框。

---

## ✅ 解决方案

### 新增文件

#### 1. `src/components/InfiniteCanvas/AddChapterDialog.tsx`

**功能**:
- ✅ 对话框组件,用于添加章节到时间线
- ✅ 两级联动选择:先选择小说项目,再选择章节
- ✅ 自动加载用户的小说项目列表
- ✅ 根据选择的项目加载章节大纲列表
- ✅ 调用 API 添加章节到时间线

**核心逻辑**:

```typescript
// 1. 加载小说项目列表
const response = await fetch("/api/novel/projects");
const data = await response.json();
setProjects(data.projects || []);

// 2. 根据选择的项目加载章节列表
const response = await fetch(`/api/novel/projects/${projectId}/outlines`);
const data = await response.json();
setChapters(data.outlines || []);

// 3. 添加章节到时间线
const response = await fetch(`/api/canvas/timeline/${timelineId}/chapters`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chapter_id: selectedChapterId,
    chapter_number: selectedChapter.chapterNumber,
  }),
});
```

---

### 修改文件

#### 2. `src/components/InfiniteCanvas/TimelineContainer.tsx`

**变更点**:

1. **导入新组件**
   ```typescript
   import { AddChapterDialog } from "./AddChapterDialog";
   ```

2. **新增状态**
   ```typescript
   const [showAddChapter, setShowAddChapter] = useState(false);
   ```

3. **新增按钮 (Header)**
   ```tsx
   <Button variant="outline" size="sm" onClick={handleAddChapter}>
     <Plus className="w-4 h-4 mr-1" />
     添加章节
   </Button>
   ```

4. **空状态时显示按钮**
   ```tsx
   <div className="flex flex-col items-center justify-center h-64 text-gray-400">
     <Plus className="w-12 h-12 mb-4" />
     <p className="mb-4">暂无章节，请先添加章节</p>
     <Button onClick={handleAddChapter} variant="outline">
       <Plus className="w-4 h-4 mr-2" />
       添加章节
     </Button>
   </div>
   ```

5. **渲染对话框**
   ```tsx
   <AddChapterDialog
     open={showAddChapter}
     onClose={() => setShowAddChapter(false)}
     timelineId={timeline.id}
     onAdded={onRefresh}
   />
   ```

#### 3. `src/components/InfiniteCanvas/index.ts`

**变更点**:
```typescript
export { AddChapterDialog } from "./AddChapterDialog";
```

---

## 🎨 UI 效果

### Header 区域

```
┌────────────────────────────────────────────────────────┐
│  时间线标题                                              │
│  0/0 章节完成 | 0 镜头 | 0 图片                           │
│                                                         │
│  [+ 添加章节] [⚙️ 设置] [▶ 全部生成]                      │
└────────────────────────────────────────────────────────┘
```

### 空状态

```
┌────────────────────────────────────────────────────────┐
│                                                         │
│                      ➕                                  │
│                                                         │
│              暂无章节，请先添加章节                         │
│                                                         │
│                 [+ 添加章节]                             │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### 添加章节对话框

```
┌─────────────────────────────────────────────────┐
│  添加章节到时间线                                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  选择小说项目                                     │
│  ┌────────────────────────────────────────┐    │
│  │ 我的小说项目 ▼                           │    │
│  └────────────────────────────────────────┘    │
│                                                 │
│  选择章节                                        │
│  ┌────────────────────────────────────────┐    │
│  │ 第1章: 序章 ▼                            │    │
│  └────────────────────────────────────────┘    │
│                                                 │
│                           [取消]  [添加]        │
└─────────────────────────────────────────────────┘
```

---

## 🔄 使用流程

### 步骤 1: 打开对话框

两种方式:
1. 点击 Header 的 **"添加章节"** 按钮
2. 空状态时点击居中的 **"添加章节"** 按钮

### 步骤 2: 选择小说项目

- 下拉列表自动加载用户创建的所有小说项目
- 选择一个项目

### 步骤 3: 选择章节

- 根据选择的项目,自动加载该项目的章节大纲列表
- 显示格式: `第N章: 标题`
- 如果项目没有章节,显示提示: "该项目暂无章节大纲"

### 步骤 4: 确认添加

- 点击 **"添加"** 按钮
- 成功后显示 Toast 提示
- 自动刷新时间线,新章节出现在列表中

---

## 📊 数据流

```
用户点击 "添加章节"
    ↓
打开 AddChapterDialog
    ↓
GET /api/novel/projects (加载项目列表)
    ↓
用户选择项目
    ↓
GET /api/novel/projects/{id}/outlines (加载章节列表)
    ↓
用户选择章节
    ↓
POST /api/canvas/timeline/{id}/chapters
    ↓
{
  chapter_id: "xxx",
  chapter_number: 1
}
    ↓
创建 TimelineChapter 记录
    ↓
更新 CanvasTimeline.total_chapters
    ↓
返回成功
    ↓
刷新时间线页面 (onRefresh)
    ↓
显示新添加的章节 ✓
```

---

## 🔌 API 依赖

### 1. 获取小说项目列表

**Endpoint**: `GET /api/novel/projects`

**响应**:
```json
{
  "projects": [
    {
      "id": "project-uuid",
      "title": "我的小说"
    }
  ]
}
```

### 2. 获取章节大纲列表

**Endpoint**: `GET /api/novel/projects/{projectId}/outlines`

**响应**:
```json
{
  "outlines": [
    {
      "id": "outline-uuid",
      "chapterNumber": 1,
      "title": "序章"
    }
  ]
}
```

### 3. 添加章节到时间线

**Endpoint**: `POST /api/canvas/timeline/{timelineId}/chapters`

**请求体**:
```json
{
  "chapter_id": "outline-uuid",
  "chapter_number": 1
}
```

**响应**:
```json
{
  "success": true,
  "chapter": {
    "id": "timeline-chapter-uuid",
    "timeline_id": "timeline-uuid",
    "chapter_id": "outline-uuid",
    "chapter_number": 1,
    "script_status": "pending",
    "shot_status": "pending",
    "scene_status": "pending",
    "final_status": "pending"
  }
}
```

---

## ✅ 完成清单

- [x] 创建 `AddChapterDialog.tsx` 组件
- [x] 集成到 `TimelineContainer.tsx`
- [x] 添加 Header 按钮
- [x] 添加空状态按钮
- [x] 导出新组件
- [x] 类型安全检查 (Lint 零错误)
- [x] 创建功能说明文档

---

## 🎯 测试验证

### 前置条件

1. 用户已登录
2. 用户至少有一个小说项目
3. 小说项目至少有一个章节大纲

### 测试步骤

1. **访问无限画布页面**
   ```
   http://localhost:3000/novel/canvas/{timelineId}
   ```

2. **点击 "添加章节" 按钮**
   - ✅ 对话框弹出
   - ✅ 项目列表加载成功

3. **选择小说项目**
   - ✅ 章节列表自动加载
   - ✅ 显示 "第N章: 标题" 格式

4. **选择章节并点击 "添加"**
   - ✅ Toast 提示 "添加成功"
   - ✅ 对话框关闭
   - ✅ 时间线刷新,新章节显示在列表中

5. **验证章节卡片**
   - ✅ 显示章节号
   - ✅ 所有状态为 "待生成"
   - ✅ 可以开始生成流程

---

## 🐛 边界情况处理

### 1. 用户没有小说项目

**现象**: 项目下拉列表为空

**处理**: 
- 显示空的 Select
- 用户需要先去小说模块创建项目

### 2. 项目没有章节大纲

**现象**: 章节下拉列表为空

**处理**:
- 显示提示: "该项目暂无章节大纲"
- "添加" 按钮保持禁用状态

### 3. 重复添加同一章节

**现象**: 后端返回错误 (如果有唯一约束)

**处理**:
- 捕获错误并显示 Toast
- 提示用户该章节已存在

### 4. 网络请求失败

**现象**: API 调用失败

**处理**:
- 捕获错误并显示 Toast
- 保持对话框打开,允许用户重试

---

## 📝 代码质量

- ✅ **类型安全**: 所有类型明确定义
- ✅ **错误处理**: try-catch 捕获所有异步操作
- ✅ **用户反馈**: Toast 提示成功/失败
- ✅ **加载状态**: 按钮禁用 + 加载文本
- ✅ **Lint 检查**: 零错误

---

## 🔗 相关文档

- [无限画布设计文档](./plans/2026-01-16-infinite-canvas-design.md)
- [图像生成集成报告](./canvas-image-generation-integration.md)
- [后端 API 文档](../src/app/api/canvas/timeline/[id]/chapters/route.ts)

---

## 📅 更新日志

**2026-01-16**:
- ✅ 创建 `AddChapterDialog` 组件
- ✅ 集成到 `TimelineContainer`
- ✅ 添加 UI 入口 (Header + 空状态)
- ✅ 完成文档

---

**功能状态**: ✅ **已完成,可立即使用**
