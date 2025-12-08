# 📋 角色资产管理系统 - 完整实施计划

## 🎯 总体目标

为角色库的三大核心功能（三视图、表情矩阵、服装管理）实现两种方案：
1. **方案 1**：AI 自动生成（使用 Stable Diffusion）
2. **方案 2**：用户手动上传图片

---

## 📊 现状分析

| 功能模块 | AI 生成状态 | 手动上传状态 | 优先级 |
|---------|------------|-------------|-------|
| **三视图** | ✅ 已完成 | ❌ 未实现 | 🔥 高 |
| **表情矩阵** | ⚠️ 接口框架存在，未集成图片生成 | ❌ 未实现 | 🔥 高 |
| **服装管理** | ⚠️ 仅生成提示词，未集成图片生成 | ❌ 未实现 | 🔶 中 |

---

## 📅 实施计划（分 4 个阶段）

### 🏗️ **Phase 1: 基础设施完善**（2-3 小时）

#### Task 1.1: 创建通用图片上传组件
**目标**: 为三个模块提供统一的图片上传 UI

- [ ] 创建 `ImageUploadDialog.tsx` 组件
  - 支持拖拽上传
  - 预览功能
  - 图片裁剪/压缩（可选）
  - 多图上传（用于批量上传）
  
- [ ] 创建 `ImagePreviewCard.tsx` 组件
  - 显示已上传/生成的图片
  - 支持替换（重新上传）
  - 支持删除
  - 显示操作按钮（AI 生成 / 手动上传）

**文件清单**:
```
src/components/AssetLibrary/
├── ImageUploadDialog.tsx       (新建)
└── ImagePreviewCard.tsx        (新建)
```

**预估时间**: 1.5 小时

---

#### Task 1.2: 创建通用图片上传 API
**目标**: 统一处理图片上传到 MinIO

- [ ] 创建 `POST /api/character/upload-image` 接口
  - 参数：`character_id`, `type`, `sub_type`, `file`
  - `type`: `view` | `expression` | `outfit`
  - `sub_type`: 具体类型（如 `front`, `happy`, `school` 等）
  - 验证图片格式和大小
  - 上传到 MinIO（覆盖或新增）
  - 更新数据库记录

**文件清单**:
```
src/app/api/character/
└── upload-image/
    └── route.ts                (新建)
```

**预估时间**: 1 小时

---

### 🎨 **Phase 2: 三视图功能完善**（2-3 小时）

#### Task 2.1: 三视图添加手动上传
**目标**: 在已有 AI 生成基础上添加手动上传选项

- [ ] 修改 `CharacterDetailView.tsx` - 三视图部分
  - 每个视图添加"上传图片"按钮
  - 点击后打开 `ImageUploadDialog`
  - 上传成功后刷新显示

- [ ] UI 改进
  - 空白视图显示两个按钮：
    - 🤖 "AI 生成" （已有）
    - 📤 "手动上传" （新增）
  - 已有图片显示操作菜单：
    - 🔄 "重新生成"
    - 📤 "替换图片"
    - 🗑️ "删除"

**文件清单**:
```
src/components/AssetLibrary/
└── CharacterDetailView.tsx     (修改 - 三视图部分)
```

**预估时间**: 1.5 小时

---

#### Task 2.2: 批量上传三视图
**目标**: 允许用户一次上传 3 张图片

- [ ] 添加"批量上传三视图"功能
  - 上传 3 张图片
  - 自动识别正面/侧面/背面（可选：AI 识别或手动指定）
  - 一次性保存

**预估时间**: 1 小时

---

### 😊 **Phase 3: 表情矩阵功能完善**（3-4 小时）

#### Task 3.1: 表情矩阵 AI 生成实现
**目标**: 集成图片生成功能

- [ ] 创建 `lib/expression-generation.ts`
  - `generateExpression()` - 生成单个表情
  - `generateAllExpressions()` - 批量生成 9 个表情
  - 使用 `callImageGenerationByType()` 调用 SD

- [ ] 修改 `/api/character/generate-expressions/route.ts`
  - 集成图片生成逻辑（参考三视图实现）
  - 上传到 MinIO: `users/{id}/characters/{id}/expressions/{type}.png`
  - 保存到数据库

**表情提示词模板**:
```typescript
const expressionPrompts = {
  happy: "smiling, happy expression, bright eyes",
  sad: "sad expression, tears, downcast eyes",
  angry: "angry expression, furrowed brows, intense gaze",
  // ... 其他 6 种
};
```

**文件清单**:
```
src/lib/
└── expression-generation.ts    (新建)

src/app/api/character/generate-expressions/
└── route.ts                    (修改)
```

**预估时间**: 2 小时

---

#### Task 3.2: 表情矩阵手动上传
**目标**: 支持用户上传自己的表情图

- [ ] 修改 `CharacterDetailView.tsx` - 表情矩阵部分
  - 每个表情格子添加上传功能
  - 空白格子显示：
    - 🤖 "AI 生成"
    - 📤 "上传"
  - 已有表情显示操作菜单

- [ ] 批量上传功能
  - 一次上传多个表情
  - 显示表情类型选择器

**文件清单**:
```
src/components/AssetLibrary/
└── CharacterDetailView.tsx     (修改 - 表情部分)
```

**预估时间**: 1.5 小时

---

### 👔 **Phase 4: 服装管理功能完善**（3-4 小时）

#### Task 4.1: 服装 AI 生成实现
**目标**: 为服装生成实际图片

- [ ] 创建 `lib/outfit-generation.ts`
  - `generateOutfit()` - 生成服装图
  - 基于角色 + 服装描述生成

- [ ] 修改 `/api/character/outfits/route.ts`
  - 添加 `generate_image` 参数
  - 集成图片生成
  - 上传到 MinIO: `users/{id}/characters/{id}/outfits/{outfit_id}.png`
  - 更新 `outfit.image_url`

- [ ] 添加 `POST /api/character/outfits/[id]/generate` 接口
  - 为已存在的服装生成图片

**文件清单**:
```
src/lib/
└── outfit-generation.ts        (新建)

src/app/api/character/outfits/
├── route.ts                    (修改)
└── [id]/
    └── generate/
        └── route.ts            (新建)
```

**预估时间**: 2 小时

---

#### Task 4.2: 服装手动上传
**目标**: 支持用户上传服装图片

- [ ] 修改 `CharacterDetailView.tsx` - 服装管理部分
  - 创建服装时可选上传图片
  - 服装卡片显示：
    - 🤖 "生成图片"（如果没有图片）
    - 📤 "上传图片"
    - 🔄 "替换图片"（如果已有图片）

- [ ] 修改 `CreateOutfitDialog.tsx`
  - 添加图片上传选项
  - 可选：先创建服装，后上传图片

**文件清单**:
```
src/components/AssetLibrary/
├── CharacterDetailView.tsx     (修改 - 服装部分)
└── CreateOutfitDialog.tsx      (修改)
```

**预估时间**: 1.5 小时

---

## 📦 完整文件清单

### 新建文件（8 个）

```
src/components/AssetLibrary/
├── ImageUploadDialog.tsx           ⭐ 通用图片上传对话框
└── ImagePreviewCard.tsx            ⭐ 通用图片预览卡片

src/lib/
├── expression-generation.ts        ⭐ 表情生成逻辑
└── outfit-generation.ts            ⭐ 服装生成逻辑

src/app/api/character/
├── upload-image/
│   └── route.ts                    ⭐ 通用图片上传 API
└── outfits/[id]/generate/
    └── route.ts                    ⭐ 服装图片生成 API
```

### 修改文件（4 个）

```
src/components/AssetLibrary/
├── CharacterDetailView.tsx         🔧 添加上传功能到三个模块
└── CreateOutfitDialog.tsx          🔧 添加图片上传选项

src/app/api/character/
├── generate-expressions/route.ts   🔧 集成图片生成
└── outfits/route.ts                🔧 添加图片生成逻辑
```

---

## ⏱️ 时间预估

| 阶段 | 任务数 | 预估时间 | 累计时间 |
|------|--------|---------|---------|
| Phase 1: 基础设施 | 2 | 2-3 小时 | 3 小时 |
| Phase 2: 三视图 | 2 | 2-3 小时 | 6 小时 |
| Phase 3: 表情矩阵 | 2 | 3-4 小时 | 10 小时 |
| Phase 4: 服装管理 | 2 | 3-4 小时 | 14 小时 |
| **测试和调优** | - | 2 小时 | **16 小时** |

**总计**: 约 2 个工作日（16 小时）

---

## 🎯 实施顺序建议

### 推荐顺序（按依赖关系）

```
Day 1 上午:
├─ Phase 1.1: ImageUploadDialog          (1.5h)
├─ Phase 1.2: upload-image API           (1h)
└─ 测试基础设施                            (0.5h)

Day 1 下午:
├─ Phase 2.1: 三视图手动上传              (1.5h)
├─ Phase 2.2: 三视图批量上传              (1h)
└─ 测试三视图完整功能                      (0.5h)

Day 2 上午:
├─ Phase 3.1: 表情 AI 生成                (2h)
├─ Phase 3.2: 表情手动上传                (1.5h)
└─ 测试表情矩阵                            (0.5h)

Day 2 下午:
├─ Phase 4.1: 服装 AI 生成                (2h)
├─ Phase 4.2: 服装手动上传                (1.5h)
└─ 完整测试和文档                          (1h)
```

---

## 🔧 技术实现要点

### 1. 图片上传流程统一

```typescript
// 统一的上传接口
POST /api/character/upload-image
{
  character_id: string,
  type: "view" | "expression" | "outfit",
  sub_type: string,  // "front" | "happy" | "school" 等
  file: File
}

// MinIO 存储路径规则
users/{userId}/characters/{charId}/{type}s/{subType}.png

// 示例：
users/abc/characters/xyz/views/front.png
users/abc/characters/xyz/expressions/happy.png
users/abc/characters/xyz/outfits/outfit-001.png
```

### 2. AI 生成 + 手动上传并存

```typescript
// UI 状态机
interface ImageState {
  hasImage: boolean;
  isGenerating: boolean;
  isUploading: boolean;
}

// 空白状态
if (!hasImage) {
  return (
    <>
      <Button onClick={handleGenerate}>🤖 AI 生成</Button>
      <Button onClick={handleUpload}>📤 上传图片</Button>
    </>
  );
}

// 已有图片状态
return (
  <DropdownMenu>
    <DropdownMenuItem onClick={handleRegenerate}>
      🔄 重新生成
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleReplace}>
      📤 替换图片
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDelete}>
      🗑️ 删除
    </DropdownMenuItem>
  </DropdownMenu>
);
```

### 3. 批量操作优化

```typescript
// 表情矩阵：一键生成全部
const generateAllExpressions = async () => {
  // 并行生成 9 个表情
  const results = await Promise.all(
    EXPRESSIONS.map(exp => generateExpression(charId, exp))
  );
};

// 三视图：批量上传
const uploadThreeViews = async (files: [File, File, File]) => {
  const types = ["front", "side", "back"];
  await Promise.all(
    files.map((file, i) => uploadImage(charId, types[i], file))
  );
};
```

---

## ✅ 验收标准

### Phase 1 完成标准
- [ ] 图片上传对话框可正常打开和关闭
- [ ] 可以选择/拖拽上传图片
- [ ] 上传 API 返回正确的 MinIO URL
- [ ] 图片在 MinIO 中可以访问

### Phase 2 完成标准
- [ ] 三视图可以 AI 生成（已有）
- [ ] 三视图可以手动上传
- [ ] 可以替换已有的三视图
- [ ] 批量上传 3 张图片功能正常

### Phase 3 完成标准
- [ ] 单个表情可以 AI 生成
- [ ] 一键生成全部 9 种表情
- [ ] 每个表情可以手动上传
- [ ] 可以替换已有表情

### Phase 4 完成标准
- [ ] 创建服装时可以生成图片
- [ ] 为已有服装生成图片
- [ ] 创建服装时可以上传图片
- [ ] 可以替换服装图片

---

## 🚀 快速开始

选择从哪个阶段开始：

### 选项 A：完整实施（推荐）
```bash
# 按顺序完成 Phase 1 → 2 → 3 → 4
# 优点：逐步构建，测试充分
# 时间：2 个工作日
```

### 选项 B：优先级实施
```bash
# 顺序：Phase 1 → Phase 2 → Phase 3（部分）
# 优点：快速完成核心功能
# 时间：1.5 个工作日
```

### 选项 C：分模块实施
```bash
# 先完成三视图（Phase 1 + Phase 2）
# 再完成表情（Phase 3）
# 最后完成服装（Phase 4）
# 优点：每个模块独立验收
```

---

## 📝 下一步行动

**请确认：**
1. ✅ 你想从哪个 Phase 开始？（推荐 Phase 1）
2. ✅ 是否需要我先实现某个具体功能？
3. ✅ 有没有特殊需求或优先级调整？

**我准备好开始实现了！告诉我从哪里开始。** 🚀
