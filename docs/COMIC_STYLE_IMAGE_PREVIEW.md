# 图片预览功能说明

## 功能概述

为漫画风格管理页面添加了点击图片查看大图的功能,提升用户体验。

## 实现位置

### 1. 列表预览图片

**位置**: 风格列表表格的"预览"列

**交互**:
- 鼠标悬停时显示高亮边框 (ring-2 ring-primary)
- 鼠标指针变为手型 (cursor-pointer)
- 点击图片弹出大图预览对话框

**样式变化**:
```css
/* 默认状态 */
w-16 h-16 object-cover rounded-md border border-border

/* 悬停状态 */
cursor-pointer hover:ring-2 hover:ring-primary transition-all
```

### 2. 编辑表单预览图片

**位置**: 新增/编辑风格对话框的"风格图片"区域

**交互**:
- 与列表预览相同的悬停效果
- 点击图片弹出大图预览对话框
- 支持查看 AI 生成或上传的图片

## 技术实现

### 状态管理

```typescript
const [previewImage, setPreviewImage] = useState<{
  url: string;
  name: string;
} | null>(null);
```

### 点击事件

```typescript
onClick={() => setPreviewImage({
  url: style.image_url,
  name: style.name_zh
})}
```

### 预览对话框

使用 shadcn/ui 的 `Dialog` 组件:

```tsx
<Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>{previewImage?.name} - 风格预览</DialogTitle>
    </DialogHeader>
    <div className="flex items-center justify-center p-4">
      {previewImage && (
        <img
          src={previewImage.url}
          alt={previewImage.name}
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
        />
      )}
    </div>
  </DialogContent>
</Dialog>
```

## 用户体验优化

### 1. 视觉反馈

- **悬停效果**: 2px 蓝色边框高亮
- **过渡动画**: `transition-all` 平滑过渡
- **鼠标指针**: `cursor-pointer` 提示可点击

### 2. 响应式设计

- **对话框最大宽度**: `max-w-4xl` (适配大屏)
- **图片最大高度**: `max-h-[70vh]` (防止超出视口)
- **图片缩放**: `object-contain` (保持比例)

### 3. 交互流程

```
用户操作流程:
1. 鼠标移到图片上 → 显示高亮边框
2. 点击图片 → 弹出大图对话框
3. 查看大图 → 点击对话框外部或 ESC 键关闭
4. 关闭对话框 → 回到列表页面
```

## 应用场景

### 场景 1: 查看风格列表中的图片详情

```
用户在浏览风格列表时:
- 缩略图尺寸: 64x64 (w-16 h-16)
- 需要查看清晰大图来确认风格细节
- 点击即可查看原图
```

### 场景 2: 编辑时确认生成效果

```
用户使用 AI 生成图片后:
- 预览区显示 128x128 (w-32 h-32) 缩略图
- 点击查看生成的完整图片
- 确认效果后决定是否保存
```

## 技术细节

### 1. 类型安全

```typescript
interface PreviewImage {
  url: string;    // 图片 URL
  name: string;   // 风格名称(用于对话框标题)
}
```

### 2. 关闭逻辑

```typescript
// 点击对话框外部关闭
onOpenChange={(open) => !open && setPreviewImage(null)}

// 清空预览状态
setPreviewImage(null)
```

### 3. 条件渲染

```typescript
// 只有当 previewImage 不为 null 时才显示对话框
open={!!previewImage}

// 确保图片存在才渲染
{previewImage && <img src={previewImage.url} ... />}
```

## 样式规范

### 缩略图样式

```css
/* 基础样式 */
.thumbnail {
  width: 4rem;              /* w-16 */
  height: 4rem;             /* h-16 */
  object-fit: cover;        /* 裁剪填充 */
  border-radius: 0.375rem;  /* rounded-md */
  border: 1px solid;        /* border */
  cursor: pointer;          /* 可点击 */
}

/* 悬停状态 */
.thumbnail:hover {
  box-shadow: 0 0 0 2px hsl(var(--primary)); /* ring-2 ring-primary */
  transition: all 150ms;                      /* transition-all */
}
```

### 大图样式

```css
/* 对话框内大图 */
.preview-image {
  max-width: 100%;          /* max-w-full */
  max-height: 70vh;         /* max-h-[70vh] */
  object-fit: contain;      /* 保持比例 */
  border-radius: 0.5rem;    /* rounded-lg */
}
```

## 浏览器兼容性

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ 移动端浏览器

所有现代浏览器均支持 `object-fit`, `max-height`, `vh` 单位。

## 性能优化

1. **懒加载**: 图片仅在对话框打开时加载
2. **事件委托**: 使用 React 合成事件,无需手动清理
3. **状态管理**: 使用 `useState`,避免不必要的重渲染

## 未来增强

### 可能的改进方向

1. **图片缩放**: 支持鼠标滚轮缩放
2. **图片旋转**: 支持左右旋转查看
3. **键盘导航**: 支持方向键切换上一张/下一张
4. **下载功能**: 添加下载按钮保存图片
5. **分享功能**: 生成分享链接

---

**最后更新**: 2026-01-17  
**维护者**: AI Coding Assistant
