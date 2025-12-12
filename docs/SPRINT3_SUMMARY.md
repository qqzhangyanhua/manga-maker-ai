# Phase 1 - Sprint 3 实施总结

## 概述

本次 Sprint 3 实施完成了 **Version Control & History (版本控制与历史记录)** 的完整开发，包括版本快照、版本恢复、版本对比、前端组件和自动清理机制。

**实施时间**: 2025-12-12
**状态**: ✅ 全部完成

---

## 已完成任务清单

### ✅ S3-T1: 实现版本控制 API

**文件**:
- `src/app/api/projects/[id]/versions/route.ts`
- `src/app/api/projects/[id]/versions/restore/route.ts`
- `src/app/api/projects/[id]/versions/[versionId]/route.ts`

#### 1. GET /api/projects/[id]/versions

**功能**: 获取项目的版本历史列表

**Query 参数**:
- `page`: 页码 (default: 1)
- `limit`: 每页数量 (default: 20, max: 100)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "versions": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

---

#### 2. POST /api/projects/[id]/versions

**功能**: 创建项目版本快照

**请求体**:
```json
{
  "label": "功能完成版本",
  "createdByAction": "batch_generate"
}
```

**版本数据结构**:
```typescript
version_data: {
  project: {
    title: string;
    description: string | null;
    style: string | null;
  },
  panels: Array<{
    id: string;
    panel_order: number;
    description: string;
    panel_type: string;
    importance: string;
    camera_angle: string | null;
    shot_size: string | null;
    dialogue: string | null;
    character_name: string | null;
    emotion: string | null;
    generated_image: string | null;
    prompt_used: string | null;
  }>,
  script?: {
    content: string;
    segments: unknown[];
  }
}
```

**自动变更检测**:
系统会自动对比上一个版本，生成 `change_summary`：
- "标题已修改"
- "新增 3 个分镜"
- "删除 2 个分镜"
- "修改 5 个分镜"

**自动清理机制**:
```typescript
// 自动保留最近 50 个自动保存版本
// 删除更早的非固定、无标签的自动保存版本
const autoSaveVersions = await prisma.projectVersion.findMany({
  where: {
    project_id: projectId,
    is_auto: true,
    is_pinned: false,
    label: null
  },
  orderBy: { created_at: "desc" },
  skip: 50 // Keep last 50
});
```

**版本类型**:
- **自动保存版本** (`is_auto: true, label: null`)：系统自动创建，会被自动清理
- **手动版本** (`is_auto: false` 或有 `label`)：用户创建，不会被自动清理
- **固定版本** (`is_pinned: true`)：永久保留，不会被删除

**响应**:
```json
{
  "success": true,
  "data": {
    "version": {
      "id": "version-uuid",
      "version_number": 5,
      "label": "功能完成版本",
      "change_summary": "新增 3 个分镜, 修改 2 个分镜",
      "is_auto": false,
      "is_pinned": false,
      "created_by_action": "batch_generate"
    }
  },
  "message": "版本创建成功"
}
```

---

#### 3. POST /api/projects/[id]/versions/restore

**功能**: 恢复项目到指定版本

**请求体**:
```json
{
  "versionId": "version-uuid",
  "createBackup": true
}
```

**恢复流程**:
```typescript
// 1. 创建恢复前备份（如果 createBackup=true）
if (createBackup) {
  backupVersion = await createVersion({
    label: `恢复前备份 (版本 ${version.version_number})`,
    is_pinned: true,
    created_by_action: "restore_backup"
  });
}

// 2. 在事务中恢复数据
await prisma.$transaction(async (tx) => {
  // 2.1 更新项目元数据
  await tx.project.update({ data: versionData.project });

  // 2.2 删除所有当前分镜
  await tx.panel.deleteMany({ where: { project_id } });

  // 2.3 从版本重建分镜（生成新 ID）
  await tx.panel.createMany({ data: versionData.panels });

  // 2.4 更新或创建脚本
  if (versionData.script) {
    await tx.storyScript.upsert({ data: versionData.script });
  }
});
```

**响应**:
```json
{
  "success": true,
  "data": {
    "version": { ... },
    "backupVersion": { ... }
  },
  "message": "成功恢复到版本 5，已自动创建恢复前备份"
}
```

---

#### 4. GET /api/projects/[id]/versions/[versionId]

**功能**: 获取单个版本的详细信息

**响应**: 返回完整的版本对象和项目信息

---

#### 5. PATCH /api/projects/[id]/versions/[versionId]

**功能**: 更新版本元数据

**请求体**:
```json
{
  "label": "重要里程碑",
  "isPinned": true
}
```

**用途**:
- 添加/修改版本标签
- 固定/取消固定版本
- 添加标签后自动将 `is_auto` 设为 `false`

---

#### 6. DELETE /api/projects/[id]/versions/[versionId]

**功能**: 删除版本

**限制**:
- 不能删除固定版本 (`is_pinned: true`)
- 必须先取消固定才能删除

---

### ✅ S3-T2: 实现版本对比 API

**文件**:
- `src/app/api/projects/[id]/versions/compare/route.ts`

#### GET /api/projects/[id]/versions/compare

**功能**: 对比两个版本的差异

**Query 参数**:
- `from`: 版本 ID (必填)
- `to`: 版本 ID (必填)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "versionFrom": { ... },
    "versionTo": { ... },
    "diff": {
      "project": {
        "changed": ["title", "description"],
        "values": {
          "from": {
            "title": "旧标题",
            "description": "旧描述"
          },
          "to": {
            "title": "新标题",
            "description": "新描述"
          }
        }
      },
      "panels": {
        "added": [
          { "id": "new-panel-1", "panel_order": 5, "description": "..." }
        ],
        "removed": [
          { "id": "old-panel-1", "panel_order": 3, "description": "..." }
        ],
        "modified": [
          {
            "panelId": "panel-id",
            "changes": ["description", "generated_image", "prompt_used"]
          }
        ]
      }
    }
  }
}
```

**对比逻辑**:

**1. 项目信息对比**:
```typescript
const projectChanges: string[] = [];

if (dataFrom.project.title !== dataTo.project.title) {
  projectChanges.push("title");
  projectValues.from.title = dataFrom.project.title;
  projectValues.to.title = dataTo.project.title;
}
// ... 对比 description, style
```

**2. 分镜对比**:
```typescript
// 创建分镜 ID Map
const panelMapFrom = new Map(panelsFrom.map(p => [p.id, p]));
const panelMapTo = new Map(panelsTo.map(p => [p.id, p]));

// 新增的分镜（在 To 中有，From 中没有）
const addedPanels = panelsTo.filter(p => !panelMapFrom.has(p.id));

// 删除的分镜（在 From 中有，To 中没有）
const removedPanels = panelsFrom.filter(p => !panelMapTo.has(p.id));

// 修改的分镜（两个版本都有，但字段不同）
const modifiedPanels = [];
panelsTo.forEach(panelTo => {
  const panelFrom = panelMapFrom.get(panelTo.id);
  if (panelFrom) {
    const changes = getChangedFields(panelFrom, panelTo);
    if (changes.length > 0) {
      modifiedPanels.push({ panelId: panelTo.id, changes });
    }
  }
});
```

**对比字段**:
```typescript
const fieldsToCompare = [
  'description', 'panel_type', 'importance', 'camera_angle',
  'shot_size', 'dialogue', 'character_name', 'emotion',
  'generated_image', 'prompt_used', 'panel_order'
];
```

---

### ✅ S3-T3: 创建版本控制前端组件

#### 1. VersionHistoryPanel 组件

**文件**: `src/components/Version/VersionHistoryPanel.tsx`

**功能**:
- 展示版本历史列表（分页）
- 版本信息卡片（版本号、标签、时间、变更说明）
- 版本选择（最多选 2 个用于对比）
- 版本操作菜单：
  - 查看详情
  - 恢复此版本
  - 固定/取消固定
  - 删除版本
- 对比选中版本按钮

**版本标签显示**:
- 固定版本：黄色标签 + 图钉图标
- 自动保存：灰色 "自动保存" 标签
- 用户标签：蓝色标签 + 标签图标

**选择逻辑**:
```typescript
// 最多选 2 个版本用于对比
if (selectedVersions.length < 2) {
  setSelectedVersions([...prev, versionId]);
} else {
  // 替换最早的选择
  setSelectedVersions([prev[1], versionId]);
}
```

**Props**:
```typescript
interface VersionHistoryPanelProps {
  projectId: string;
  onRestore?: (versionId: string) => void;
  onCompare?: (versionFromId: string, versionToId: string) => void;
  onViewVersion?: (versionId: string) => void;
}
```

**UI 特性**:
- 选中版本高亮显示（ring-2 ring-primary）
- 固定版本不可删除
- 自动保存版本灰色显示
- 响应式卡片布局
- 分页支持

---

#### 2. RestoreVersionDialog 组件

**文件**: `src/components/Version/RestoreVersionDialog.tsx`

**功能**:
- 显示要恢复的版本信息
- 创建恢复前备份开关（默认开启）
- 警告提示（删除当前分镜、恢复版本数据）
- 备份说明
- 确认恢复按钮

**版本信息展示**:
- 版本号
- 分镜数量
- 变更说明
- 创建时间

**备份选项**:
```typescript
<Switch
  id="backup"
  checked={createBackup}
  onCheckedChange={setCreateBackup}
/>
```

**警告内容**:
- 删除所有当前分镜
- 恢复版本中的所有分镜
- 更新项目标题、描述和风格
- 恢复脚本内容（如有）
- 未启用备份时额外警告

**Props**:
```typescript
interface RestoreVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: ProjectVersion | null;
  projectId: string;
  onRestore: (data: RestoreVersionData) => Promise<void>;
}

export interface RestoreVersionData {
  projectId: string;
  versionId: string;
  createBackup: boolean;
}
```

---

#### 3. VersionCompareView 组件

**文件**: `src/components/Version/VersionCompareView.tsx`

**功能**:
- 并排展示两个版本头部信息
- 总变更数量统计
- 项目信息变更展示（原值 vs 新值）
- 分镜变更分类展示：
  - 新增分镜（绿色）
  - 删除分镜（红色）
  - 修改分镜（蓝色）
- 修改字段详细列表
- 无变化提示

**版本头部对比**:
```typescript
<Card>版本 {versionFrom.version_number}</Card>
<ArrowRight />
<Card>版本 {versionTo.version_number}</Card>
```

**项目信息变更展示**:
```typescript
<Card>
  <Badge>标题</Badge>
  <Grid>
    <div className="bg-red-500/10">原值: 旧标题</div>
    <div className="bg-green-500/10">新值: 新标题</div>
  </Grid>
</Card>
```

**分镜变更分类**:
- **新增分镜**: 绿色背景卡片，显示分镜顺序和描述
- **删除分镜**: 红色背景卡片，显示分镜顺序和描述
- **修改分镜**: 蓝色背景卡片，显示修改的字段列表

**字段标签映射**:
```typescript
const labels: Record<string, string> = {
  title: "标题",
  description: "描述",
  style: "风格",
  panel_type: "类型",
  importance: "重要性",
  camera_angle: "镜头角度",
  shot_size: "景别",
  dialogue: "对白",
  character_name: "角色名称",
  emotion: "情绪",
  generated_image: "生成图片",
  prompt_used: "提示词",
  panel_order: "顺序"
};
```

**Props**:
```typescript
interface VersionCompareViewProps {
  projectId: string;
  versionFromId: string;
  versionToId: string;
}
```

---

## 技术亮点

### 1. 增量快照设计

**数据存储**:
```typescript
version_data: {
  project: { title, description, style },
  panels: [{ ...panelData }],
  script: { content, segments }
}
```

**优势**:
- 每个版本存储完整状态（便于恢复）
- JSON 字段灵活存储任意结构
- 无需复杂的 diff 算法

**劣势**:
- 存储空间较大
- 多版本时有数据冗余

**生产优化建议**:
```typescript
// 使用增量 diff 存储
version_data: {
  type: "full" | "incremental",
  base_version_id?: string,
  changes: {
    project: { changed_fields, values },
    panels: { added, removed, modified }
  }
}
```

---

### 2. 自动备份机制

**恢复前备份**:
```typescript
if (createBackup) {
  backupVersion = await prisma.projectVersion.create({
    data: {
      label: `恢复前备份 (版本 ${version.version_number})`,
      is_pinned: true,  // 固定备份，防止误删
      created_by_action: "restore_backup"
    }
  });
}
```

**好处**:
- 用户可随时撤销恢复操作
- 备份自动固定，不会被清理
- 清晰的标签说明备份来源

---

### 3. 版本自动清理

**清理策略**:
```typescript
// 保留规则：
// 1. 固定版本 (is_pinned: true) - 永久保留
// 2. 有标签的版本 (label != null) - 永久保留
// 3. 自动保存版本 (is_auto: true, label: null) - 保留最近 50 个
```

**实现**:
```typescript
const autoSaveVersions = await prisma.projectVersion.findMany({
  where: {
    project_id: projectId,
    is_auto: true,
    is_pinned: false,
    label: null
  },
  orderBy: { created_at: "desc" },
  skip: 50 // Keep last 50
});

if (autoSaveVersions.length > 0) {
  await prisma.projectVersion.deleteMany({
    where: { id: { in: autoSaveVersions.map(v => v.id) } }
  });
}
```

**好处**:
- 自动控制存储空间
- 重要版本不会被误删
- 用户可手动标记需要保留的版本

---

### 4. 事务保证一致性

**恢复操作的原子性**:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. 更新项目
  // 2. 删除旧分镜
  // 3. 创建新分镜
  // 4. 更新脚本
});
```

**好处**:
- 要么全部成功，要么全部回滚
- 不会出现部分恢复的中间状态
- 数据一致性有保障

---

### 5. 智能变更检测

**自动生成 change_summary**:
```typescript
const changes: string[] = [];

// 检测项目变更
if (prevData.project.title !== currData.project.title) {
  changes.push("标题已修改");
}

// 检测分镜数量变化
const prevPanelCount = prevData.panels.length;
const currPanelCount = currData.panels.length;
if (currPanelCount > prevPanelCount) {
  changes.push(`新增 ${currPanelCount - prevPanelCount} 个分镜`);
}

// 检测分镜内容修改
const modifiedCount = detectModifiedPanels(prevData, currData);
if (modifiedCount > 0) {
  changes.push(`修改 ${modifiedCount} 个分镜`);
}

changeSummary = changes.join(", ");
```

**好处**:
- 用户一目了然看到版本变化
- 无需手动填写变更说明
- 便于快速定位版本差异

---

## 文件清单

### 后端 API
- ✅ `src/app/api/projects/[id]/versions/route.ts` - GET/POST
- ✅ `src/app/api/projects/[id]/versions/restore/route.ts` - POST
- ✅ `src/app/api/projects/[id]/versions/[versionId]/route.ts` - GET/PATCH/DELETE
- ✅ `src/app/api/projects/[id]/versions/compare/route.ts` - GET

### 前端组件
- ✅ `src/components/Version/VersionHistoryPanel.tsx`
- ✅ `src/components/Version/RestoreVersionDialog.tsx`
- ✅ `src/components/Version/VersionCompareView.tsx`

---

## 使用示例

### 1. 创建版本流程

```typescript
// 1. 自动保存（后台定时触发）
const autoSaveVersion = async () => {
  await fetch(`/api/projects/${projectId}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      // 不提供 label，自动标记为 is_auto: true
      createdByAction: 'auto_save'
    })
  });
};

// 2. 手动保存版本
const createMilestone = async () => {
  await fetch(`/api/projects/${projectId}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      label: '第一章完成',
      createdByAction: 'manual'
    })
  });
};
```

---

### 2. 恢复版本流程

```typescript
// 1. 显示版本历史
<VersionHistoryPanel
  projectId={projectId}
  onRestore={handleOpenRestoreDialog}
/>

// 2. 确认恢复
<RestoreVersionDialog
  open={showRestoreDialog}
  onOpenChange={setShowRestoreDialog}
  version={selectedVersion}
  projectId={projectId}
  onRestore={handleRestore}
/>

// 3. 执行恢复
const handleRestore = async (data: RestoreVersionData) => {
  const response = await fetch(
    `/api/projects/${projectId}/versions/restore`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  );

  toast.success('恢复成功!');
  refetchProject();
  refetchVersions();
};
```

---

### 3. 对比版本流程

```typescript
// 1. 在版本历史中选择两个版本
<VersionHistoryPanel
  projectId={projectId}
  onCompare={handleCompare}
/>

// 2. 显示对比视图
const handleCompare = (fromId: string, toId: string) => {
  setCompareVersions({ fromId, toId });
  setShowCompare(true);
};

// 3. 展示对比结果
<VersionCompareView
  projectId={projectId}
  versionFromId={compareVersions.fromId}
  versionToId={compareVersions.toId}
/>
```

---

## 测试建议

### 手动测试清单

**版本创建测试**:
```bash
# 1. 创建自动保存版本
curl -X POST http://localhost:3000/api/projects/{projectId}/versions \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. 创建手动版本
curl -X POST http://localhost:3000/api/projects/{projectId}/versions \
  -H "Content-Type: application/json" \
  -d '{"label": "里程碑版本"}'

# 3. 获取版本列表
curl http://localhost:3000/api/projects/{projectId}/versions
```

**版本恢复测试**:
```bash
# 1. 恢复版本（带备份）
curl -X POST http://localhost:3000/api/projects/{projectId}/versions/restore \
  -H "Content-Type: application/json" \
  -d '{"versionId": "xxx", "createBackup": true}'

# 2. 恢复版本（不备份）
curl -X POST http://localhost:3000/api/projects/{projectId}/versions/restore \
  -H "Content-Type: application/json" \
  -d '{"versionId": "xxx", "createBackup": false}'
```

**版本对比测试**:
```bash
# 对比两个版本
curl "http://localhost:3000/api/projects/{projectId}/versions/compare?from={fromId}&to={toId}"
```

**版本管理测试**:
```bash
# 1. 固定版本
curl -X PATCH http://localhost:3000/api/projects/{projectId}/versions/{versionId} \
  -H "Content-Type: application/json" \
  -d '{"isPinned": true}'

# 2. 添加标签
curl -X PATCH http://localhost:3000/api/projects/{projectId}/versions/{versionId} \
  -H "Content-Type: application/json" \
  -d '{"label": "重要版本"}'

# 3. 删除版本
curl -X DELETE http://localhost:3000/api/projects/{projectId}/versions/{versionId}
```

**UI 测试**:
1. 测试版本历史面板
   - 版本列表展示
   - 选择版本（最多 2 个）
   - 版本操作菜单
   - 固定/取消固定
   - 删除版本

2. 测试恢复版本对话框
   - 版本信息展示
   - 备份开关
   - 警告提示
   - 确认恢复

3. 测试版本对比视图
   - 版本头部对比
   - 项目信息变更
   - 分镜变更（新增/删除/修改）
   - 变更数量统计

---

## 后续改进计划

### 短期改进

1. **版本标注增强**
   - 添加版本描述字段
   - 支持版本标签分类
   - 版本创建原因详细记录

2. **对比功能增强**
   - 支持并排查看分镜图片
   - 高亮显示修改的具体内容
   - 导出对比报告（PDF）

3. **恢复功能增强**
   - 部分恢复（只恢复分镜或只恢复元数据）
   - 合并恢复（保留某些分镜，恢复其他分镜）
   - 恢复预览

### 中期改进

1. **版本分支功能**
   - 从某个版本创建分支
   - 多分支管理
   - 分支合并

2. **协作功能**
   - 版本评论
   - 版本审批流程
   - 冲突解决

3. **存储优化**
   - 增量 diff 存储
   - 压缩版本数据
   - 版本归档（冷存储）

### 长期改进

1. **智能版本建议**
   - AI 分析重要变更点
   - 自动推荐创建版本时机
   - 智能命名版本

2. **版本分析**
   - 版本树可视化
   - 变更趋势分析
   - 协作贡献统计

---

## 总结

Sprint 3 成功完成了 **Version Control & History** 的完整实现：

**✅ 已完成**:
- 完整的版本 CRUD API
- 版本恢复功能（带自动备份）
- 版本对比功能（详细 diff）
- 自动变更检测
- 版本自动清理机制
- 3 个前端组件（历史面板、恢复对话框、对比视图）

**📊 代码统计**:
- 后端代码：~1600 行
- 前端代码：~1300 行
- **总计：~2900 行**

**🎯 核心特性**:
- ✅ 完整快照存储
- ✅ 一键恢复（带备份保护）
- ✅ 详细版本对比
- ✅ 智能变更检测
- ✅ 自动清理策略
- ✅ 固定版本保护

**🚀 生产级特性**:
- 事务保证一致性
- 自动备份机制
- 误操作保护
- 存储空间管理

Sprint 3 完成后，用户可以安全地进行版本管理，不用担心误操作导致数据丢失，为项目迭代和协作奠定了坚实基础！
