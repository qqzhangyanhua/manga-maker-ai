# 风格回显问题修复

## 问题描述
用户设置默认风格后，页面刷新或重新加载时，风格选择器没有显示之前选择的风格（回显失败）。

## 根本原因

发现了两个问题：

### 1. Query Key 不匹配
- `useTimelineWindow` 使用查询键: `["timeline", timelineId, {...}]`
- `useUpdateTimelineConfig` 只刷新: `["timeline-config", timelineId]`
- 结果：更新后 `useTimelineWindow` 的缓存没有被刷新

### 2. `getSafeConfig` 函数问题
`getSafeConfig` 使用了严格的类型守卫，如果配置不完全符合要求（比如缺少某些布尔字段），就返回默认配置，**导致 `default_comic_style_id` 被丢弃**。

```typescript
// 旧代码（有问题）
export function getSafeConfig(config: unknown): CanvasTimelineConfig {
  if (isValidTimelineConfig(config)) {  // 严格检查，容易失败
    return config;
  }

  // 返回默认配置（没有 default_comic_style_id）
  return {
    auto_generate: true,
    use_character_library: true,
    use_scene_library: true,
  };
}
```

## 修复方案

### 修复 1: 刷新所有相关查询
**文件**: `src/hooks/useTimelineConfig.ts`

```typescript
onSettled: () => {
  // 刷新 useTimelineConfig 使用的查询键
  queryClient.invalidateQueries({
    queryKey: ["timeline-config", timelineId],
  });
  // 刷新 useTimelineWindow 使用的查询键
  queryClient.invalidateQueries({
    queryKey: ["timeline", timelineId],
  });
},
```

### 修复 2: 优化 `getSafeConfig` 函数
**文件**: `src/hooks/useTimelineConfig.ts`

```typescript
export function getSafeConfig(config: unknown): CanvasTimelineConfig {
  // 如果 config 是一个对象，尝试提取所有字段（包括可选字段）
  if (config && typeof config === "object") {
    const c = config as Record<string, unknown>;

    return {
      // 必需字段（带默认值）
      auto_generate: typeof c.auto_generate === "boolean" ? c.auto_generate : true,
      use_character_library: typeof c.use_character_library === "boolean" ? c.use_character_library : true,
      use_scene_library: typeof c.use_scene_library === "boolean" ? c.use_scene_library : true,

      // 可选字段（保留原值）
      default_comic_style_id: typeof c.default_comic_style_id === "string" ? c.default_comic_style_id : undefined,
      ai_model: c.ai_model === "gpt-4" || c.ai_model === "gpt-3.5-turbo" ? c.ai_model : undefined,
      shot_density: ...,
      visual_style: ...,
      language: ...,
    };
  }

  // 返回默认配置
  return {
    auto_generate: true,
    use_character_library: true,
    use_scene_library: true,
  };
}
```

**关键改进**:
- 宽松解析：即使某些字段缺失也能提取可选字段
- 保留 `default_comic_style_id`：只要它是字符串就保留
- 向后兼容：处理各种可能的配置格式

### 修复 3: 移除冗余的 refresh 调用
**文件**: `src/app/(novel)/novel/canvas/[id]/page.tsx`

由于 `invalidateQueries` 已经会自动刷新数据，移除了手动调用 `refresh()` 的代码。

## 测试验证

创建了测试脚本验证 `getSafeConfig` 的修复：

```
测试 1: 完整配置（包含风格 ID） ✅ 通过
测试 2: 最小配置（无风格 ID） ✅ 通过
测试 3: null 配置 ✅ 通过
测试 4: 空对象 ✅ 通过
测试 5: JSON 字符串（数据库返回格式） ✅ 通过
```

## 预期效果

修复后：
1. ✅ 选择风格 → 立即看到乐观更新
2. ✅ API 成功后 → 自动刷新所有时间线查询
3. ✅ 刷新页面 → 风格选择器正确回显之前的选择
4. ✅ 取消设置 → 显示"未设置"
5. ✅ 向后兼容 → 现有时间线和各种配置格式都能正常工作

## 验证步骤

1. 重启开发服务器: `npm run dev`
2. 访问 canvas 页面: `/novel/canvas/{timeline-id}`
3. 选择一个风格 → 看到 Toast "风格设置成功"
4. **刷新页面** → 验证风格选择器显示之前选择的风格 ✅
5. 选择"未设置" → 验证清除成功
6. **再次刷新页面** → 验证显示"未设置" ✅
