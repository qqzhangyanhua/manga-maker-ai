# GenerateShotImageDialog 风格选择优化

## 修改内容

将 `GenerateShotImageDialog` 组件从"手动选择风格"改为"使用时间线默认风格"。

## 修改理由

- **统一性**: 确保同一时间线生成的所有镜头图片使用统一的风格
- **简化流程**: 减少用户操作步骤，避免每次生成都要选择风格
- **源头管理**: 风格应该在时间线级别统一设置，而不是分散在每个镜头

## 主要变更

### 1. 移除的功能
- ❌ 移除风格选择下拉框（`<Select>`）
- ❌ 移除 `selectedStyleId` 状态
- ❌ 移除手动选择风格的 UI

### 2. 新增的功能
- ✅ 自动从时间线配置读取默认风格
- ✅ 只读显示当前使用的风格（带预览图）
- ✅ 未设置风格时显示警告提示
- ✅ 提供"前往设置风格"按钮

### 3. UI 变化

**之前（可选择）:**
```
┌─────────────────────────────┐
│ 漫画风格                    │
│ [选择漫画风格 ▼]            │
│                             │
│ [风格预览卡片]              │
└─────────────────────────────┘
```

**之后（只读显示）:**
```
┌─────────────────────────────┐
│ 漫画风格                    │
│ ┌───────────────────────┐   │
│ │ [预览图] 日式漫画      │   │
│ │ Black and white...    │   │
│ │         [时间线默认]   │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

**未设置风格时:**
```
┌─────────────────────────────┐
│ 漫画风格                    │
│ ┌───────────────────────┐   │
│ │ ⚠ 未设置默认漫画风格   │   │
│ │ 请先在画布页面顶部...  │   │
│ │ [⚙ 前往设置风格]      │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

## 代码变更详情

### 导入变更
```typescript
// 新增
import { useTimelineConfig, getSafeConfig } from "@/hooks/useTimelineConfig";
import { findStyleById, useComicStyles } from "@/hooks/useComicStyles";
import { Settings } from "lucide-react";

// 移除
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

### 数据获取变更
```typescript
// 旧代码
const [selectedStyleId, setSelectedStyleId] = useState<string>("__default__");
const { data: stylesData } = useQuery({ ... });

// 新代码
const { data: timelineData } = useTimelineConfig(timelineId);
const defaultStyleId = getSafeConfig(timelineData?.timeline.config).default_comic_style_id;
const { data: stylesData } = useComicStyles({ enabled: !!defaultStyleId });
const currentStyle = findStyleById(stylesData?.data, defaultStyleId);
```

### 提交逻辑变更
```typescript
// 旧代码
onConfirm({
  characters: selectedCharacters,
  comicStyleId: selectedStyleId === "__default__" ? undefined : selectedStyleId,
});

// 新代码
onConfirm({
  characters: selectedCharacters,
  comicStyleId: defaultStyleId, // 直接使用时间线默认风格
});
```

### 按钮禁用逻辑
```typescript
// 旧代码
disabled={!shotInfo || isSubmitting}

// 新代码
disabled={!shotInfo || isSubmitting || !defaultStyleId}
// 没有设置风格时禁用生成按钮
```

## 用户体验改进

### 场景 1: 已设置默认风格
1. 打开对话框
2. 自动显示时间线的默认风格（只读）
3. 选择角色
4. 点击"确认生成"

**优势**: 减少一步选择操作，风格统一

### 场景 2: 未设置默认风格
1. 打开对话框
2. 看到醒目的警告提示
3. 点击"前往设置风格"关闭对话框
4. 在 canvas 页面顶部设置默认风格
5. 重新打开对话框生成

**优势**: 引导用户先设置风格，避免混乱

## 向后兼容性

- ✅ API 接口保持不变（`onConfirm` 仍接收 `comicStyleId`）
- ✅ 后端逻辑无需修改
- ✅ 已有时间线正常工作（未设置风格时会提示）

## 测试要点

1. **有默认风格**:
   - 对话框显示当前风格
   - 生成成功
   - 生成的图片使用正确的风格

2. **无默认风格**:
   - 对话框显示警告提示
   - "确认生成"按钮禁用
   - 点击"前往设置风格"关闭对话框

3. **风格切换**:
   - 在 canvas 页面修改默认风格
   - 重新打开对话框
   - 验证显示新风格

## 相关文件

- `src/app/(novel)/novel/components/InfiniteCanvas/GenerateShotImageDialog.tsx` - 主文件
- `src/hooks/useTimelineConfig.ts` - 时间线配置 hooks
- `src/hooks/useComicStyles.ts` - 风格列表 hooks
- `src/app/(novel)/novel/canvas/[id]/page.tsx` - Canvas 页面（风格设置入口）

## 后续优化建议

1. **快速切换**: 添加"临时更换风格"选项（高级功能）
2. **批量操作**: 支持批量设置多个时间线的默认风格
3. **风格预设**: 保存常用风格组合
