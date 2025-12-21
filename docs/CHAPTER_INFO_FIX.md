# 章节信息显示修复 ✅

## 问题描述
用户反馈：生成的图片不知道是哪个章节的，缺少章节标签。

## 根本原因
虽然数据库已经支持保存章节信息（`chapter_id` 和 `panel_ids`），但有两个问题：
1. **API 未返回章节信息**：`/api/story/[id]/panels` 没有 include chapter 关系
2. **对话框未显示章节**：多镜生成对话框没有显示当前操作的章节

## 已修复的问题

### 1. ✅ API 返回章节信息
**文件**: `src/app/api/story/[id]/panels/route.ts`

**修改前**:
```typescript
const panels = await prisma.panel.findMany({
    where: { project_id: projectId },
    orderBy: { panel_order: 'asc' },
});
```

**修改后**:
```typescript
const panels = await prisma.panel.findMany({
    where: { project_id: projectId },
    orderBy: { panel_order: 'asc' },
    include: {
        chapter: {
            select: {
                id: true,
                title: true,
                chapter_order: true,
            },
        },
    },
});
```

### 2. ✅ 多镜生成 API 包含章节信息
**文件**: `src/app/api/panel/generate-multi/route.ts`

**改进**:
- 查询分镜时 include chapter 关系
- 保存图片时记录 `chapter_id` 和 `panel_ids`
- 添加详细的日志输出

```typescript
// 查询分镜数据（包含章节信息）
const panels = await prisma.panel.findMany({
  where: { id: { in: panel_ids } },
  orderBy: { panel_order: "asc" },
  include: {
    project: true,
    chapter: {
      select: {
        id: true,
        title: true,
        chapter_order: true,
      },
    },
  },
});

// 保存时记录章节信息
const chapterId = panels[0].chapter_id || null;
await prisma.generatedImage.create({
  data: {
    // ... 其他字段
    chapter_id: chapterId,
    panel_ids: panel_ids,
  },
});
```

### 3. ✅ 对话框显示章节信息
**文件**: `src/app/scripts/[id]/components/MultiPanelGenerateDialog.tsx`

**新增功能**:
1. **标题下方显示章节**：在对话框描述中显示章节名称
2. **章节信息卡片**：在选择提示上方显示蓝色章节卡片
3. **自动提取章节**：从选中的第一个分镜获取章节信息

```tsx
// 获取章节信息
const chapterInfo = selectedPanels.length > 0 && selectedPanels[0].chapter 
  ? {
      title: selectedPanels[0].chapter.title,
      order: selectedPanels[0].chapter.chapter_order,
    }
  : null;

// 显示在对话框中
<DialogDescription>
  选择 2-6 个分镜，AI 将一次性生成包含多格的图片
  {chapterInfo && (
    <span className="block mt-1 text-primary font-medium">
      📖 {chapterInfo.title}
    </span>
  )}
</DialogDescription>

// 章节信息卡片
{chapterInfo && (
  <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
    <BookOpen className="w-4 h-4 text-blue-500" />
    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
      第 {chapterInfo.order} 章：{chapterInfo.title}
    </span>
  </div>
)}
```

### 4. ✅ 类型定义更新
**文件**: `src/app/scripts/[id]/types/script-editor.types.ts`

添加 `chapter` 关系到 `Panel` 接口：
```typescript
export interface Panel {
  // ... 其他字段
  chapter_id?: string; // FK to Chapter
  chapter?: {
    id: string;
    title: string;
    chapter_order: number;
  }; // Chapter relation (populated when included)
  // ... 其他字段
}
```

## 用户体验改进

### 多镜生成对话框
**之前**:
- 用户不知道正在为哪个章节生成图片
- 选择分镜时没有章节上下文

**现在**:
- 📖 对话框标题下方显示章节名称
- 🔵 蓝色章节信息卡片清晰标识
- 显示格式："第 X 章：章节标题"

### 生成图库
**之前**:
- 图片没有章节标签
- 无法快速识别图片所属章节

**现在**:
- 🔵 蓝色章节徽章："第X章"
- 🟣 紫色分镜徽章："N镜"
- 详情对话框显示完整章节信息

## 数据流程

```
用户选择分镜
    ↓
前端显示章节信息（从 panel.chapter 获取）
    ↓
调用 /api/panel/generate-multi
    ↓
API 查询分镜（include chapter）
    ↓
生成图片
    ↓
保存到 generated_images（记录 chapter_id 和 panel_ids）
    ↓
图库显示（从 generated_images 读取章节和分镜信息）
```

## 测试步骤

### 1. 测试多镜生成对话框
1. 打开剧本详情页
2. 确保分镜已关联章节
3. 点击"多镜生成"按钮
4. **验证**: 对话框应显示章节信息（如"第1章：开始"）

### 2. 测试图片生成
1. 选择 2-6 个分镜
2. 选择风格（可选）
3. 点击"生成多格图片"
4. **验证**: 生成成功后，图库中应显示章节徽章

### 3. 测试图库显示
1. 切换到"生成图库"标签页
2. **验证**: 
   - 新图片左上角有蓝色章节徽章
   - 紫色分镜徽章显示分镜数量
   - 点击图片查看详情，显示完整章节和分镜信息

## 注意事项

### 兼容性
- ✅ 旧数据（没有章节的分镜）不会显示章节信息
- ✅ 如果选中的分镜没有章节，对话框不显示章节卡片
- ✅ 向后兼容，不影响现有功能

### 性能
- ✅ 使用 Prisma include 一次性加载章节信息
- ✅ 避免 N+1 查询问题
- ✅ 数据库索引已创建（`idx_generated_images_chapter`）

### 数据一致性
- ✅ 假设同一批选中的分镜属于同一章节
- ✅ 从第一个分镜获取章节信息
- ✅ 如果分镜来自不同章节，建议在 UI 层面限制选择

## 相关文件

### 修改的文件
1. `src/app/api/story/[id]/panels/route.ts` - 返回章节信息
2. `src/app/api/panel/generate-multi/route.ts` - 包含和保存章节信息
3. `src/app/scripts/[id]/components/MultiPanelGenerateDialog.tsx` - 显示章节信息
4. `src/app/scripts/[id]/types/script-editor.types.ts` - 类型定义

### 相关文档
- `docs/SERIALIZED_COMIC_FEATURE_SUMMARY.md` - 完整功能文档
- `docs/QUICK_REFERENCE_SERIALIZED_COMIC.md` - 快速参考
- `docs/MIGRATION_FIX_APPLIED.md` - 数据库迁移说明

## 下一步建议

### 短期优化
1. **章节筛选**：在图库中添加章节筛选器
2. **章节验证**：选择分镜时验证是否属于同一章节
3. **批量操作**：支持按章节批量下载图片

### 长期优化
1. **章节导航**：图库顶部添加章节导航栏
2. **时间线视图**：按章节顺序展示连载漫画
3. **章节统计**：显示每章的图片数量和生成进度

## 总结

✅ **所有问题已解决！**

现在用户可以：
- 在多镜生成对话框中清楚看到正在为哪个章节生成图片
- 在图库中通过章节徽章快速识别图片所属章节
- 在详情对话框中查看完整的章节和分镜信息

重启开发服务器后即可体验新功能！

---

**更新时间**: 2025-12-21
**状态**: ✅ 完成

