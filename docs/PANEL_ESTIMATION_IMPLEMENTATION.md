# 章节镜头数量预估系统 - 实现文档

## 概述

本文档记录了**章节镜头数量预估系统**的完整实现，该系统允许用户在生成漫画分镜前，快速预估章节将生成多少个镜头，以及消耗多少 credits。

## 核心价值

### 用户价值
1. **成本透明**：生成前明确知道会消耗多少 credits
2. **可预测性**：了解章节将生成多少镜头
3. **质量控制**：过长/过短章节会收到警告提示
4. **灵活控制**：支持 sparse/standard/dense 三种密度模式

### 技术价值
1. **零成本预估**：前端本地计算，无需调用 LLM
2. **双模式支持**：本地快速预估 + API 精确预估
3. **完整测试覆盖**：15个单元测试，100%通过
4. **类型安全**：完整的 TypeScript 类型定义

---

## 文件结构

```
src/
├── lib/
│   └── panel-estimator.ts                          # 后端核心逻辑
│
├── app/
│   ├── api/chapter/[id]/estimate-panels/
│   │   └── route.ts                                 # REST API 端点
│   │
│   └── (novel)/novel/[id]/
│       ├── types.ts                                 # 类型定义（新增）
│       ├── components/
│       │   ├── ChapterList.tsx                      # 章节列表（已修改）
│       │   └── PanelEstimationBadge.tsx             # 预估徽章组件
│       ├── hooks/
│       │   └── usePanelEstimation.ts                # React Hook
│       └── utils/
│           ├── panelEstimator.ts                    # 前端本地计算
│           └── __tests__/
│               └── panelEstimator.test.ts           # 单元测试
```

---

## API 文档

### `GET /api/chapter/[id]/estimate-panels`

**功能**：预估章节应生成的镜头数量

**Query Parameters**:
- `densityMode` (可选): `'sparse' | 'standard' | 'dense'` (默认 `'standard'`)

**Response**:
```typescript
{
  estimatedCount: number;      // 预估镜头数（核心数值）
  minCount: number;             // 最少镜头数（下界）
  maxCount: number;             // 最多镜头数（上界）
  wordCount: number;            // 章节字数统计
  baseDensity: number;          // 基础密度（字/镜）
  genre: string;                // 故事类型
  estimatedCredits: number;     // 预估消耗 credits
  densityMode: string;          // 当前密度模式
  warnings: string[];           // 警告信息
}
```

**示例**:
```bash
GET /api/chapter/abc123/estimate-panels?densityMode=standard

{
  "estimatedCount": 23,
  "minCount": 16,
  "maxCount": 30,
  "wordCount": 5100,
  "baseDensity": 220,
  "genre": "suspense",
  "estimatedCredits": 46,
  "densityMode": "standard",
  "warnings": []
}
```

---

## 镜头密度配置

### 按类型的密度表

| 类型 (genre) | 字数/镜头 | 5000字章节 | 10000字章节 | 特点 |
|--------------|-----------|------------|-------------|------|
| **悬疑** (suspense) | 220 | ~23镜 | ~45镜 | 紧张节奏，频繁切换 |
| **爱情** (romance) | 280 | ~18镜 | ~36镜 | 舒缓叙事，重对话 |
| **冒险** (adventure) | 200 | ~25镜 | ~50镜 | 动作密集，镜头多 |
| **科幻** (scifi) | 240 | ~21镜 | ~42镜 | 平衡叙事和场景 |
| **日常** (daily) | 300 | ~17镜 | ~33镜 | 慢节奏，重氛围 |
| **奇幻** (fantasy) | 230 | ~22镜 | ~43镜 | 中等密度 |
| **默认** (default) | 250 | ~20镜 | ~40镜 | 未知类型兜底 |

### 密度模式调整

| 模式 | 系数 | 示例（250字/镜基础） | 适用场景 |
|------|------|---------------------|----------|
| **sparse** (稀疏) | 1.4× | 350字/镜 | 省 credits，快速预览 |
| **standard** (标准) | 1.0× | 250字/镜 | 平衡质量和成本 |
| **dense** (密集) | 0.6× | 150字/镜 | 高质量，细腻表现 |

---

## 前端使用指南

### 1. 直接导入工具函数（推荐）

```typescript
import { estimatePanelCountFromOutline } from "@/app/(novel)/novel/[id]/utils/panelEstimator";

const chapter = {
  chapterNumber: 1,
  title: "第一章",
  outline: "章节内容...",
  // ...
};

const estimation = estimatePanelCountFromOutline(
  chapter,
  "suspense",  // 故事类型
  "standard",  // 密度模式
  2            // 每镜头 credits 成本
);

console.log(`预计生成 ${estimation.estimatedCount} 个镜头`);
console.log(`消耗 ${estimation.estimatedCredits} credits`);
```

### 2. 使用 React Hook

```typescript
import { usePanelEstimation } from "@/app/(novel)/novel/[id]/hooks/usePanelEstimation";

function MyComponent({ chapterId }: { chapterId: string }) {
  const { estimation, loading, error } = usePanelEstimation({
    chapterId,
    densityMode: "standard",
    autoFetch: true,
  });

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      预估镜头数: {estimation?.estimatedCount}
    </div>
  );
}
```

### 3. 使用徽章组件

```typescript
import { PanelEstimationBadge } from "@/app/(novel)/novel/[id]/components/PanelEstimationBadge";

function MyComponent() {
  const { estimation, loading, error } = usePanelEstimation({ chapterId });

  return (
    <PanelEstimationBadge
      estimation={estimation}
      loading={loading}
      error={error}
      mode="compact" // 或 "detailed"
    />
  );
}
```

---

## 警告系统

系统会在以下情况生成警告：

| 条件 | 警告信息 |
|------|----------|
| 章节 < 1500字 | "章节过短（少于1500字），建议补充内容或与其他章节合并" |
| 章节 > 12000字 | "章节过长（超过12000字），建议拆分以获得更好的分镜效果" |
| 镜头数 >= 50个 | "镜头数已达到上限（50个），系统将自动截断" |
| 镜头数 <= 5个 | "镜头数过少（N个），可能影响叙事完整性" |

---

## 测试覆盖

### 测试统计
- **测试文件**: `panelEstimator.test.ts`
- **测试用例数**: 15
- **通过率**: 100% ✅

### 测试覆盖范围

1. **核心算法测试** (7个)
   - 基础镜头数计算
   - 不同类型密度差异
   - 密度模式调整
   - 最小/最大约束
   - 未知类型兜底

2. **功能测试** (6个)
   - 章节对象预估
   - 镜头范围计算
   - Credits 消耗计算
   - 警告生成（过短/过长）
   - 批量预估

3. **边界测试** (2个)
   - 空数组处理
   - 极端值处理

### 运行测试

```bash
pnpm test src/app/\(novel\)/novel/\[id\]/utils/__tests__/panelEstimator.test.ts
```

---

## 集成步骤

### 1. 章节列表显示预估

已完成！`ChapterList.tsx` 现在会显示每个章节的预估镜头数：

```tsx
<div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
  <span>{chapter.wordCount} 字</span>
  <div className="flex items-center gap-1">
    <Film className="h-3 w-3" />
    <span>~{estimation.estimatedCount} 镜</span>
  </div>
</div>
```

### 2. 生成前确认对话框（待实现）

建议在用户点击"生成分镜"按钮时，展示确认对话框：

```tsx
const handleGeneratePanels = async () => {
  const estimation = await fetchPanelEstimation(chapterId);

  const confirmed = await showConfirmDialog({
    title: "确认生成分镜",
    message: `
      预计生成 ${estimation.estimatedCount} 个镜头（${estimation.minCount}-${estimation.maxCount}）
      消耗 ${estimation.estimatedCredits} credits

      是否继续？
    `,
  });

  if (confirmed) {
    await generatePanels(chapterId);
  }
};
```

---

## 性能优化

1. **前端缓存**：本地计算结果可缓存，避免重复计算
2. **批量预估**：支持一次性预估多个章节
3. **懒加载**：仅在需要时调用 API 精确预估

---

## 未来增强方向

### Phase 1: 当前实现 ✅
- [x] 基础预估算法
- [x] REST API 端点
- [x] 前端本地计算
- [x] 章节列表集成
- [x] 单元测试

### Phase 2: 用户控制 (下周)
- [ ] 密度模式选择器 UI
- [ ] 生成前确认对话框
- [ ] 批量生成预估汇总

### Phase 3: 智能优化 (下下周)
- [ ] 基于历史数据的预估优化
- [ ] 章节内容语义分析（识别对话/动作/叙述占比）
- [ ] 个性化推荐（根据用户偏好调整密度）

---

## 技术债务

1. **数据库扩展**：考虑在 `Chapter` 表新增 `estimated_panel_count` 字段缓存预估结果
2. **日志记录**：当前未记录预估请求，建议添加到 `generation_logs` 表
3. **A/B测试**：收集实际生成镜头数 vs 预估数的差异，持续优化算法

---

## 总结

### 实现亮点

1. **双模式设计**：本地快速预估 + API 精确预估，灵活满足不同场景
2. **零破坏性**：完全向后兼容，未修改现有数据库结构
3. **高测试覆盖**：15个单元测试，保证核心逻辑正确性
4. **用户友好**：清晰的警告信息，帮助用户优化章节内容

### 数值建议

**推荐默认值**：
- 标准密度：250字/镜
- 镜头范围：5-50个
- 推荐范围：15-25个/章

**典型场景**：
- 5000字悬疑章节 → ~23镜 → ~46 credits
- 3000字爱情章节 → ~11镜 → ~22 credits
- 8000字冒险章节 → ~40镜 → ~80 credits

---

**实现完成日期**: 2026-01-10
**实现者**: Development Coordinator (Architect + Engineer + Integration + Review)
**测试状态**: 15/15 通过 ✅
