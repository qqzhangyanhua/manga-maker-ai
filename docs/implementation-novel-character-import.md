# 小说角色导入功能实现文档

## 功能概述

为小说转漫画的场景增加了从小说项目导入角色到剧本的功能，支持批量选择导入并自动去重，避免重复导入已存在的角色。

## 实现时间

2026-01-09

## 业务需求

当用户通过小说项目创建剧本时（Story.source_novel_id 存在），希望能够：
1. 从原小说项目中查看所有角色
2. 批量选择需要导入的角色
3. 系统自动识别并过滤已存在的角色（基于角色名称去重）
4. 一键批量导入选中的新角色到剧本

## 技术架构

### 1. 数据流向

```
NovelProject.characters (JSONB)
    ↓
GET /api/novel/[id]/characters
    ↓
ImportNovelCharactersDialog (用户选择)
    ↓
POST /api/story/[id]/import-novel-characters
    ↓
Character + StoryCharacter (创建并关联)
```

### 2. 去重策略

**去重维度**: 角色名称（name）

**去重逻辑**:
- 规范化处理: `name.toLowerCase().trim()`
- 比对范围: 当前剧本已关联的所有角色
- 匹配判定: 完全相等即视为重复

**为什么使用名称去重而不是ID去重？**
- NovelProject.characters 是 JSONB 存储，角色数据未创建 Character 记录
- 小说角色和剧本角色是不同的数据源
- 名称是最直观的去重标识符

### 3. 核心组件

#### 类型定义 (`src/app/scripts/[id]/types/novel-import.ts`)

```typescript
// 小说角色（从 JSONB 解析）
export interface NovelCharacter {
  name: string;
  role: string;
  description: string;
  traits?: string[];
  relationships?: Record<string, string>;
  tempId?: string; // 前端临时ID用于选择
}

// 导入请求
export interface ImportNovelCharactersRequest {
  novel_id: string;
  characters: NovelCharacter[];
}

// 导入响应
export interface ImportNovelCharactersResponse {
  imported: ImportedCharacterResult[];
  skipped: ImportedCharacterResult[];
  failed: Array<{ novel_character_name: string; reason: string }>;
  summary: {
    total: number;
    imported_count: number;
    skipped_count: number;
    failed_count: number;
  };
}
```

#### API 路由

**1. 获取小说角色列表**

- 路径: `GET /api/novel/[id]/characters`
- 功能: 从 NovelProject.characters JSONB 字段解析角色列表
- 返回: `GetNovelCharactersResponse`

**2. 导入角色到剧本**

- 路径: `POST /api/story/[id]/import-novel-characters`
- 功能: 批量创建 Character 并关联到 StoryCharacter
- 去重: 基于角色名称过滤已存在角色
- 事务: 使用 Prisma $transaction 确保原子性

**角色类型映射**:
```typescript
function mapRole(novelRole: string): CharacterRole {
  switch (novelRole.toLowerCase()) {
    case "protagonist": case "主角": return "protagonist";
    case "antagonist": case "反派": return "antagonist";
    case "supporting": case "配角": return "supporting";
    case "minor": case "龙套": return "minor";
    default: return "supporting";
  }
}
```

#### 前端组件

**1. ImportNovelCharactersDialog**
- 文件: `src/app/scripts/[id]/components/ImportNovelCharactersDialog.tsx`
- 功能:
  - 加载并展示小说角色列表
  - 自动标记已存在的角色（灰化 + 禁用选择）
  - 支持全选/反选操作
  - 显示角色详情（名称、类型、描述、特征）
  - 批量导入并展示结果摘要

**2. StoryCharactersManager**
- 文件: `src/app/scripts/[id]/components/StoryCharactersManager.tsx`
- 变更:
  - 移除 `onOpenSyncDialog` prop（改为内部状态管理）
  - 新增 `importDialogOpen` 状态
  - 集成 `ImportNovelCharactersDialog` 组件
  - "导入小说角色" 按钮直接打开新对话框

## 用户体验流程

### 1. 触发入口

**条件**: Story.source_novel_id 不为空

**位置**:
- 角色管理页操作栏 "导入小说角色" 按钮
- 空状态页 "导入小说角色" 主要操作

### 2. 导入流程

```
点击 "导入小说角色" 按钮
    ↓
加载小说角色列表
    ↓
展示角色卡片（已存在角色灰化禁用）
    ↓
用户选择要导入的角色
    ↓
点击 "导入选中角色 (N)" 按钮
    ↓
批量创建 Character + StoryCharacter
    ↓
显示导入结果摘要
    ↓
关闭对话框并刷新角色列表
```

### 3. 视觉反馈

**角色状态标识**:
- 可导入角色: 正常显示，可选择
- 已存在角色: 灰化背景 + "已存在" 徽章 + 禁用选择

**导入结果提示**:
```typescript
toast({
  title: "导入完成",
  description: `成功导入 ${imported_count} 个角色，跳过 ${skipped_count} 个`
});
```

## 数据一致性保障

### 1. 事务处理

所有角色创建和关联操作包裹在 Prisma 事务中：

```typescript
await prisma.$transaction(async (tx) => {
  for (const novelChar of toImport) {
    // 创建 Character
    const character = await tx.character.create({ ... });

    // 创建 StoryCharacter 关联
    await tx.storyCharacter.create({ ... });
  }
});
```

**好处**:
- 原子性: 全部成功或全部失败
- 一致性: 避免 Character 创建但 StoryCharacter 关联失败
- 隔离性: 并发导入操作互不干扰

### 2. 错误处理

**层级化错误处理**:

1. **单个角色失败**: 记录到 `failed` 数组，继续处理其他角色
2. **事务整体失败**: 返回 500 错误，所有操作回滚
3. **前端错误**: Toast 提示用户稍后重试

## 性能优化

### 1. 批量操作

- 一次 API 调用完成所有角色导入
- 使用事务减少数据库往返次数

### 2. 前端优化

- 自动选中可导入角色，减少用户操作
- 懒加载对话框内容（仅在打开时加载）

### 3. 数据预处理

- 在后端统一进行名称去重判断
- 前端接收已分类的角色列表（可导入/已存在）

## 测试建议

### 1. 功能测试

- [ ] 正常导入新角色
- [ ] 重复角色被正确跳过
- [ ] 部分角色重复时正确分类
- [ ] 无小说关联时不显示导入按钮
- [ ] 空角色列表的提示处理

### 2. 边缘情况

- [ ] 小说项目无角色数据
- [ ] 所有角色均已存在
- [ ] 角色名称包含特殊字符
- [ ] 大小写不同但名称相同的角色
- [ ] 并发导入相同角色

### 3. 错误处理

- [ ] 网络错误时的提示
- [ ] 事务失败时的回滚验证
- [ ] 无权限访问时的错误提示

## 后续优化方向

### 1. 增量同步

- 检测小说角色更新（描述、特征变化）
- 提供 "更新已关联角色信息" 功能

### 2. 智能推荐

- 基于剧本内容分析推荐必要角色
- 优先级排序（主角 > 配角 > 龙套）

### 3. 批量编辑

- 导入前批量修改角色类型
- 批量修改角色描述

### 4. 性能提升

- 大量角色时分页加载
- 虚拟滚动优化列表渲染

## 相关文件清单

### 新增文件

- `src/app/scripts/[id]/types/novel-import.ts` - 类型定义
- `src/app/scripts/[id]/components/ImportNovelCharactersDialog.tsx` - 导入对话框组件
- `src/app/api/novel/[id]/characters/route.ts` - 获取小说角色 API
- `src/app/api/story/[id]/import-novel-characters/route.ts` - 导入角色 API
- `docs/implementation-novel-character-import.md` - 本文档

### 修改文件

- `src/app/scripts/[id]/components/StoryCharactersManager.tsx` - 集成导入对话框
- `src/app/scripts/[id]/page.tsx` - 移除已废弃的 onOpenSyncDialog prop

## 总结

该实现提供了完整的小说角色导入功能，通过名称去重策略有效避免重复导入，使用事务确保数据一致性，并提供良好的用户体验和错误处理。整体代码符合项目规范，无 TypeScript any 类型，类型定义独立管理，组件保持在 500 行以内。
