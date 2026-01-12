# P2-1: 角色关系图谱可视化 - 实施指南

## 依赖安装

需要安装以下依赖包:

```bash
pnpm add reactflow dagre
pnpm add -D @types/dagre
```

## 已实现的文件

### 1. 类型定义
- `src/app/(novel)/novel/[id]/components/relationship-graph/types.ts`
  - RelationType: 9种关系类型(朋友/敌人/恋人/亲人/师徒/对手/盟友/中立)
  - RELATION_TYPE_CONFIGS: 关系类型样式配置
  - CharacterNodeData: 角色节点数据结构
  - RelationshipEdgeData: 关系边数据结构

### 2. 工具函数
- `src/app/(novel)/novel/[id]/components/relationship-graph/utils.ts`
  - getLayoutedElements: Dagre层次布局
  - getCircleLayout: 圆形布局
  - getGridLayout: 网格布局
  - charactersToNodes: 角色转节点
  - relationshipsToEdges: 关系转边
  - applyLayout: 应用布局算法

## 下一步实施

### 1. 安装依赖后继续实现:
- CharacterNode.tsx: 自定义角色节点组件
- RelationshipEdge.tsx: 自定义关系连线组件
- CharacterRelationshipGraph.tsx: 主图谱组件
- GraphToolbar.tsx: 工具栏组件
- RelationshipEditDialog.tsx: 关系编辑对话框

### 2. 集成到小说项目详情页:
- 在 `src/app/(novel)/novel/[id]/page.tsx` 添加新的标签页
- 连接到现有的角色管理系统

### 3. API实现:
- 保存关系数据到数据库
- 加载关系数据

## 特性

✅ 9种预定义关系类型,支持自定义样式
✅ 3种自动布局算法(层次/圆形/网格)
✅ 完整的TypeScript类型支持
✅ 高性能渲染(React Flow虚拟化)
✅ 响应式设计

## 使用示例

```typescript
import { CharacterRelationshipGraph } from './components/CharacterRelationshipGraph';

<CharacterRelationshipGraph
  projectId={projectId}
  characters={characters}
  onSave={handleSaveRelationships}
/>
```

## 待完成任务

- [ ] 安装依赖: `pnpm add reactflow dagre @types/dagre`
- [ ] 实现CharacterNode组件
- [ ] 实现RelationshipEdge组件
- [ ] 实现主图谱组件
- [ ] 实现工具栏
- [ ] 实现编辑对话框
- [ ] 集成到页面
- [ ] 测试和文档
