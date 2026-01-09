# 小说详情页面修复 - 迁移指南

## 📋 概述

本文档说明小说详情页面（`src/app/(novel)/novel/[id]/page.tsx`）重构后的破坏性变更和迁移方法。

---

## 🔴 破坏性变更

### 1. 类型定义变更

#### Character 类型

**之前：**
```typescript
interface Character {
  id: string;
  name: string;
  role: string; // "主角"、"配角"、"反派" 等中文值
  description: string;
  traits: string[];
  appearance: string;
  background: string;
  relationships: CharacterRelationship[];
}
```

**现在：**
```typescript
interface Character {
  id?: string; // ✅ 可选，支持新建角色
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "minor"; // ✅ 英文枚举
  description: string;
  traits: string[];
  relationships?: Array<{ // ✅ 简化结构
    characterId: string;
    relation: string;
  }>;
  appearance?: string; // ✅ 可选
  background?: string; // ✅ 可选
}
```

**迁移方法：**

```typescript
// ❌ 旧代码
const character: Character = {
  id: "123",
  name: "张三",
  role: "主角", // 中文
  // ...
};

// ✅ 新代码
const character: Character = {
  id: "123",
  name: "张三",
  role: "protagonist", // 英文枚举
  // ...
};

// ✅ 使用辅助函数转换
import { getRoleLabel } from "./components/character/types";
console.log(getRoleLabel("protagonist")); // "主角"
```

### 2. WorldSetting 类型

**之前：**
```typescript
world_setting: Record<string, unknown> | null
```

**现在：**
```typescript
interface WorldSetting {
  locations: Location[];
  factions: Faction[];
  rules: Rule[];
  timeline: TimelineEvent[];
}

world_setting: WorldSetting | null
```

**迁移方法：**

```typescript
// ❌ 旧代码
const worldSetting = project.world_setting as any;
const locations = worldSetting?.locations || [];

// ✅ 新代码
import { normalizeWorldSetting } from "./types";
const worldSetting = normalizeWorldSetting(project.world_setting);
const locations = worldSetting.locations; // 类型安全
```

---

## 🔄 API 变更

### 新增专用接口

虽然主接口 `PATCH /api/novel/projects/[id]` 仍然可用，但新增了专用接口：

```typescript
// 角色管理
GET    /api/novel/projects/[id]/characters
PUT    /api/novel/projects/[id]/characters

// 世界观
GET    /api/novel/projects/[id]/world-setting
PUT    /api/novel/projects/[id]/world-setting

// 大纲
GET    /api/novel/projects/[id]/outlines
PUT    /api/novel/projects/[id]/outlines
```

**推荐迁移路径：**

```typescript
// ❌ 旧代码（仍可用）
await fetch(`/api/novel/projects/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ characters: newCharacters })
});

// ✅ 新代码（推荐）
await fetch(`/api/novel/projects/${id}/characters`, {
  method: "PUT",
  body: JSON.stringify({ characters: newCharacters })
});
```

---

## 🎯 组件使用变更

### 1. 使用 useNovelProject Hook

**之前：**
```typescript
const {
  project,
  outlines, // 独立状态
  setOutlines, // 手动管理
} = useNovelProject(projectId);

// 数据可能不同步
setOutlines(newOutlines);
```

**现在：**
```typescript
const {
  project,
  outlines, // ✅ 派生自 project，自动同步
  characters, // ✅ 新增
  worldSetting, // ✅ 新增
  saveStatus, // ✅ 新增
  lastSaved, // ✅ 新增
  error, // ✅ 新增
  handleSaveOutlines, // ✅ 统一保存方法
  refetch, // ✅ 重新加载
} = useNovelProject(projectId);

// 使用统一方法保存
await handleSaveOutlines(newOutlines);
```

### 2. CharacterManager 组件

**之前：**
```typescript
<CharacterManager
  initialCharacters={project.characters as never[]} // ❌ 强制转换
  onSave={async (chars) => {
    await fetch(..., { body: { characters: chars }});
    setProject(updated);
  }}
/>
```

**现在：**
```typescript
<CharacterManager
  initialCharacters={characters} // ✅ 类型安全
  onSave={handleSaveCharacters} // ✅ 使用 Hook 方法
/>
```

### 3. 错误处理

**之前：**
```typescript
function NovelProjectPage() {
  const { project, loading } = useNovelProject(projectId);
  
  if (loading) return <Loading />;
  if (!project) return null; // ❌ 不处理错误
  
  return <div>...</div>;
}
```

**现在：**
```typescript
function NovelProjectPageContent() {
  const { project, loading, error, refetch } = useNovelProject(projectId);
  
  // ✅ 明确处理错误
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  
  if (loading) return <Loading />;
  if (!project) return null;
  
  return <div>...</div>;
}

// ✅ 包装错误边界
export default function NovelProjectPage() {
  return (
    <ErrorBoundary>
      <NovelProjectPageContent />
    </ErrorBoundary>
  );
}
```

---

## 🛠️ 工具函数变更

### 新增类型验证函数

```typescript
import {
  isValidCharacter,
  isValidWorldSetting,
  normalizeCharacters,
  normalizeWorldSetting,
} from "./types";

// ✅ 运行时类型检查
const rawData = await fetchFromAPI();
if (isValidCharacter(rawData)) {
  // TypeScript 知道 rawData 是 Character 类型
  console.log(rawData.name);
}

// ✅ 安全转换
const characters = normalizeCharacters(project.characters);
// 保证返回 Character[]，无效数据被过滤
```

### 角色定位转换

```typescript
import { getRoleLabel, CHARACTER_ROLES } from "./components/character/types";

// ✅ 显示
console.log(getRoleLabel("protagonist")); // "主角"

// ✅ 表单选项
<Select>
  {CHARACTER_ROLES.map(role => (
    <option value={role.value}>{role.label}</option>
  ))}
</Select>
```

---

## 📦 新增组件

### 1. ErrorBoundary

```typescript
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary
  fallback={<CustomError />} // 可选自定义错误页
  onReset={() => window.location.reload()}
>
  <YourComponent />
</ErrorBoundary>
```

### 2. ErrorState

```typescript
import { ErrorState } from "@/components/ErrorState";

<ErrorState
  error={new Error("加载失败")}
  title="自定义标题"
  description="自定义描述"
  onRetry={() => refetch()}
  showHomeButton={true}
/>
```

### 3. SaveIndicator

```typescript
import { SaveIndicator } from "@/components/SaveIndicator";
import type { SaveStatus } from "@/components/SaveIndicator";

const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
const [lastSaved, setLastSaved] = useState<Date | null>(null);

<SaveIndicator
  status={saveStatus}
  lastSaved={lastSaved}
  errorMessage="保存失败：网络错误"
/>
```

---

## 🔍 常见问题

### Q1: 旧数据库中的角色 role 是中文，会有问题吗？

**A:** 不会。`ensureCharacterFields` 函数包含映射逻辑：

```typescript
const roleMapping: Record<string, RoleType> = {
  "主角": "protagonist",
  "反派": "antagonist",
  "配角": "supporting",
  "路人": "minor",
};
```

旧数据会自动转换为新格式。

### Q2: 如何在其他组件中使用新类型？

**A:** 从主类型文件导入：

```typescript
import type { Character, WorldSetting, ChapterOutline } from "@/app/(novel)/novel/[id]/types";
```

### Q3: 保存指示器会自动显示吗？

**A:** 是的。所有通过 `useNovelProject` Hook 的保存操作都会自动更新 `saveStatus`。

### Q4: 旧的 API 调用会报错吗？

**A:** 不会。`PATCH /api/novel/projects/[id]` 仍然支持更新所有字段，新接口只是提供了更细粒度的选择。

### Q5: 如何测试类型安全？

**A:** 运行 TypeScript 检查：

```bash
npm run type-check
```

或在 IDE 中查看类型提示和错误标记。

---

## ✅ 迁移检查清单

### 代码层面
- [ ] 移除所有 `as never[]` 强制转换
- [ ] 使用 `normalizeCharacters()` 处理角色数据
- [ ] 使用 `normalizeWorldSetting()` 处理世界观数据
- [ ] 添加 `<ErrorBoundary>` 包装页面
- [ ] 处理 `error` 状态
- [ ] 使用 Hook 提供的统一保存方法

### 类型层面
- [ ] 将 `Character.role` 更新为英文枚举
- [ ] 使用 `getRoleLabel()` 显示中文
- [ ] 导入正确的类型定义
- [ ] 确保无 TypeScript 错误

### 测试层面
- [ ] 测试旧数据兼容性
- [ ] 测试错误场景
- [ ] 测试保存指示器
- [ ] 测试数据同步

### 文档层面
- [ ] 更新 API 文档
- [ ] 更新组件使用示例
- [ ] 通知团队成员

---

## 📞 支持

如遇到问题：
1. 查看 [P0/P1 修复总结](./p0-p1-fixes-summary.md)
2. 查看类型定义文件 `src/app/(novel)/novel/[id]/types.ts`
3. 联系技术团队

---

## 📅 更新日志

### 2026-01-09
- ✅ 初始迁移指南发布
- ✅ 类型系统重构
- ✅ 错误处理改进
- ✅ API 接口拆分
