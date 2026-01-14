# 角色关系图谱组件

## 修复记录

### 问题：节点无法连接
**症状**：拖拽节点时出现连接线，但无法建立连接

**根本原因**：
1. Handle 配置不完整 - 每个位置需要同时有 source 和 target 类型的 Handle
2. ReactFlow 缺少 `nodesConnectable` 配置

### 修复内容

#### 1. CharacterNode.tsx (第35-98行)
为每个方向（Top, Bottom, Left, Right）添加了 source 和 target 两种类型的 Handle：

```tsx
{/* 每个方向都有 source 和 target */}
<Handle type="target" position={Position.Top} id="target-top" isConnectable={true} />
<Handle type="source" position={Position.Top} id="source-top" isConnectable={true} />
// ... 其他三个方向
```

**关键点**：
- ✅ 每个方向有 8 个 Handle（4个方向 × 2种类型）
- ✅ 每个 Handle 有唯一的 `id`（如 `target-top`, `source-bottom`）
- ✅ 添加 `isConnectable={true}` 显式启用连接
- ✅ 使用 `style` 调整重叠 Handle 的位置

#### 2. CharacterRelationshipGraph.tsx (第318-320行)
添加了 ReactFlow 的连接控制属性：

```tsx
<ReactFlow
  nodesDraggable={!readonly}      // 控制节点是否可拖动
  nodesConnectable={!readonly}    // 控制节点是否可连接 (关键!)
  elementsSelectable={true}       // 允许选择元素
  ...
>
```

## 使用方法

### 创建关系
1. **拖拽连接**：从一个角色节点的连接点拖拽到另一个角色节点
2. **自动创建**：释放鼠标后会创建默认的中立关系
3. **编辑关系**：双击连接线打开编辑对话框

### 编辑关系
- 选择关系类型（朋友、敌人、恋人等 9 种）
- 添加关系描述
- 设置双向/单向关系

### 删除关系
- 双击连接线打开编辑对话框
- 点击"删除关系"按钮

## 功能特性

✅ 支持四个方向连接（Top, Bottom, Left, Right）
✅ 9 种关系类型（每种有独特颜色和样式）
✅ 4 种布局算法（Dagre, Circle, Grid, Force）
✅ 实时编辑和保存
✅ 导出为图片
✅ 只读模式
✅ 小地图和缩放控制

## 疑难排查

### 如果仍然无法连接：
1. 检查 `readonly` 属性是否为 `false`
2. 检查浏览器控制台是否有错误
3. 确认 ReactFlow 版本（需要 v11+）
4. 清除浏览器缓存并重新加载
