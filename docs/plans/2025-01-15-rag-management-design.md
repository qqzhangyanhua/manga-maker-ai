# RAG 向量数据库管理页面 - 设计文档

**创建日期**: 2025-01-15
**状态**: 已确认，准备实施
**负责人**: Admin Team

---

## 1. 项目概述

### 1.1 背景

Novel Backend 已实现基于 ChromaDB + OpenAI Embeddings 的 RAG（检索增强生成）系统，用于章节内容的语义检索。当前只有基础的 API 接口，缺少可视化管理界面，导致管理员无法直观地监控和维护向量数据。

### 1.2 目标

创建一个功能完整的 RAG 管理后台页面，提供：
- 📊 系统状态监控（总文档数、向量库大小、健康度）
- ⚙️ 索引 CRUD 管理（查看、创建、删除、重建）
- 🔍 数据质量监控（一致性检查、异常告警）
- 🛠️ 运维工具（导出/导入、批量操作、数据清理）

### 1.3 访问权限

- **仅管理员可访问**（`role === 'admin'`）
- 路径：`/admin/rag-management`
- 与现有 Admin 后台架构保持一致

---

## 2. 整体架构

### 2.1 文件结构

```
src/app/admin/rag-management/
├── page.tsx                          # 主页面（Tab 容器）
├── components/
│   ├── OverviewTab.tsx               # Tab 1: 系统概览
│   ├── IndexManagementTab.tsx        # Tab 2: 索引管理
│   ├── QualityMonitoringTab.tsx      # Tab 3: 质量监控
│   ├── MaintenanceTab.tsx            # Tab 4: 运维工具
│   ├── ChapterIndexTable.tsx         # 章节索引表格（共用）
│   ├── ConsistencyCheckResult.tsx    # 一致性检查结果
│   ├── BatchOperationDialog.tsx      # 批量操作对话框
│   └── ExportImportDialog.tsx        # 导出/导入对话框
└── types.ts                          # TypeScript 类型定义

services/novel-backend/app/routers/
└── rag.py                            # 扩展 RAG API 端点
```

### 2.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **前端框架** | Next.js 14 + React 18 + TypeScript | App Router 模式 |
| **UI 组件** | shadcn/ui + Radix UI | 延续 Admin 风格 |
| **表格** | TanStack Table v8 | 排序、过滤、分页 |
| **状态管理** | React Query v5 | 数据缓存和同步 |
| **样式** | TailwindCSS + 紫色玻璃态主题 | Comic 风格 |
| **图标** | lucide-react | 与现有一致 |
| **后端** | FastAPI + ChromaDB + PostgreSQL | 现有架构 |

---

## 3. 页面设计

### 3.1 主页面布局

**页面头部**
```
┌─────────────────────────────────────────────────┐
│ 🔍 RAG 向量数据库管理                            │
│ 智能检索引擎的指挥中心，管理所有章节的语义索引    │
│                                    [主题切换]    │
└─────────────────────────────────────────────────┘
```

**Tab 导航栏**
```
[📊 系统概览] [⚙️ 索引管理] [🔍 质量监控] [🛠️ 运维工具]
 ▔▔▔▔▔▔▔▔
```

- 使用 shadcn/ui `Tabs` 组件
- Tab 状态保存到 URL 查询参数（`?tab=overview`）
- 支持直接链接分享

---

## 4. Tab 详细设计

### 4.1 Tab 1: 系统概览

**功能目标**：展示 RAG 系统整体健康状况

**布局**：
1. **顶部统计卡片（4 列）**
   - 📚 总文档数（含今日新增）
   - 💾 向量库大小（MB）
   - 🤖 Embedding 模型（ada-002 / 1536 维）
   - ✅ 索引成功率（百分比 + 健康度状态）

2. **快速操作区域**
   - 🔍 运行一致性检查
   - 📦 批量索引项目
   - 🔄 重建所有索引
   - 🧹 清理孤立数据

3. **最近索引活动（表格）**
   - 显示最近 10 条索引记录
   - 字段：时间、项目、章节、状态

**数据源**：
- `GET /api/novel/rag/stats` - 系统统计
- `GET /api/novel/rag/recent-activities?limit=10` - 最近活动

---

### 4.2 Tab 2: 索引管理

**功能目标**：管理所有章节的向量索引

**布局**：

1. **过滤栏**
   - 搜索框（章节标题）
   - 项目筛选器
   - 状态筛选器（全部/已索引/需重建/未索引）
   - 排序选项（最近索引/章节号/字数）
   - 批量操作按钮（索引/删除）

2. **主表格**
   | 列名 | 说明 | 数据源 |
   |------|------|--------|
   | ☑ | 多选框 | - |
   | 项目名 | 所属项目 | `NovelProject.title` |
   | 章节号 | 第 X 章 | `NovelChapter.chapter_number` |
   | 标题 | 章节标题 | `NovelChapter.title` |
   | 字数 | 内容字数 | `NovelChapter.word_count` |
   | 索引时间 | 最后索引 | ChromaDB `metadata.indexed_at` |
   | 状态 | ✅/⚠️/❌ | 综合判断 |
   | 操作 | 下拉菜单 | 查看/重建/删除 |

3. **分页控件**
   - 每页 20 条
   - 显示总记录数

**状态判断逻辑**：
```typescript
enum IndexStatus {
  INDEXED = "已索引",      // ChromaDB 存在且正常
  NEED_REBUILD = "需重建", // indexed_at < chapter.updated_at
  NOT_INDEXED = "未索引"   // ChromaDB 中不存在
}
```

**数据源**：
- `GET /api/novel/rag/chapters?page=1&limit=20&project_id=xxx&status=xxx`

---

### 4.3 Tab 3: 质量监控

**功能目标**：诊断数据质量问题并提供修复

**布局**：

1. **操作栏**
   - [🔍 运行一致性检查] 按钮
   - [📊 生成质量报告] 按钮
   - 最后检查时间显示

2. **健康度仪表盘**
   ```
   系统健康度评分: 98.5 / 100
   ████████████████████████████████████░░░ 98.5%

   ✅ 已索引章节: 1,234    ⚠️ 需要处理: 12
   ```

3. **问题分类列表**

   **3.1 未索引章节**
   - 表格显示未索引的章节
   - 提供 [立即索引] 单个操作
   - [批量索引选中] 和 [索引全部] 按钮

   **3.2 孤立索引**
   - 列表显示孤立的 chapter_id
   - [清理所有孤立索引] 按钮
   - 显示释放空间估算

   **3.3 需要重建的索引**
   - 表格显示章节内容已更新但索引未同步的记录
   - 提供 [重建] 单个操作
   - [批量重建] 按钮

   **3.4 索引质量分析**
   - 平均相似度得分
   - 索引成功率（最近 7 天）
   - 平均索引耗时
   - Embedding 总成本（本月）

**数据源**：
- `POST /api/novel/rag/consistency-check`
  ```json
  {
    "total_in_pg": 1246,
    "total_in_chroma": 1234,
    "not_indexed": [...],
    "orphaned": [...],
    "need_rebuild": [...],
    "health_score": 98.5
  }
  ```

---

### 4.4 Tab 4: 运维工具

**功能目标**：数据备份恢复和系统维护

**布局**：

1. **数据导出/导入卡片**

   **导出区域**
   - 项目选择器（全部/指定项目）
   - 导出格式选择（JSON）
   - [📥 导出向量数据库] 按钮

   **导入区域**
   - 文件选择器
   - ⚠️ 覆盖警告
   - 确认 checkbox
   - [📤 导入并恢复数据] 按钮

2. **批量重建索引卡片**
   - 重建范围选择：
     - ○ 全部索引
     - ● 指定项目
     - ○ 指定时间范围
   - 成本和耗时估算
   - [🔄 开始重建索引] 按钮
   - 实时进度条

3. **数据清理工具卡片**
   - ☑ 清理孤立索引（显示数量和空间）
   - ☑ 清理过期缓存
   - ☐ 压缩向量数据库
   - [🧹 执行选中的清理操作] 按钮

4. **系统维护日志表格**
   - 最近 20 条操作记录
   - 字段：时间、操作类型、详情、状态

**数据源**：
- `POST /api/novel/rag/export?project_id=xxx`
- `POST /api/novel/rag/import` + FormData
- `POST /api/novel/rag/rebuild-index`
- `POST /api/novel/rag/cleanup`
- `GET /api/novel/rag/maintenance-logs?limit=20`

---

## 5. 后端 API 规范

### 5.1 已有 API（复用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/novel/rag/stats` | 系统统计 |
| POST | `/api/novel/rag/index-chapter` | 索引单章 |
| POST | `/api/novel/rag/batch-index` | 批量索引 |
| DELETE | `/api/novel/rag/chapter/{id}` | 删除索引 |

### 5.2 需要新增的 API

#### 5.2.1 获取章节索引列表
```
GET /api/novel/rag/chapters

Query Parameters:
- page: int = 1
- limit: int = 20
- project_id: Optional[str]
- status: Optional[str]  # "indexed" | "need_rebuild" | "not_indexed"
- search: Optional[str]  # 搜索章节标题

Response:
{
  "total": 1234,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "chapter_id": "uuid",
      "project_id": "uuid",
      "project_name": "霸总的心头宝",
      "chapter_number": 1,
      "title": "初遇",
      "word_count": 2345,
      "indexed_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-14T15:00:00Z",
      "status": "indexed"
    }
  ]
}
```

#### 5.2.2 获取单章索引详情
```
GET /api/novel/rag/chapter/{chapter_id}/detail

Response:
{
  "chapter_id": "uuid",
  "indexed": true,
  "metadata": {
    "project_id": "uuid",
    "chapter_number": 1,
    "title": "初遇",
    "indexed_at": "2025-01-15T10:00:00Z"
  },
  "embedding_dim": 1536,
  "similarity_test": 0.87  # 与自身的相似度（应接近 1.0）
}
```

#### 5.2.3 一致性检查
```
POST /api/novel/rag/consistency-check

Body (可选):
{
  "project_id": "uuid"  # 检查特定项目，不传则检查全部
}

Response:
{
  "total_in_pg": 1246,
  "total_in_chroma": 1234,
  "not_indexed": [
    {
      "chapter_id": "uuid",
      "project_name": "霸总的心头宝",
      "chapter_number": 5,
      "title": "表白"
    }
  ],
  "orphaned": ["chapter-uuid-1", "chapter-uuid-2"],
  "need_rebuild": [
    {
      "chapter_id": "uuid",
      "project_name": "修仙从筑基开始",
      "chapter_number": 2,
      "title": "金丹",
      "updated_at": "2025-01-15T12:00:00Z",
      "indexed_at": "2025-01-14T10:00:00Z"
    }
  ],
  "health_score": 98.5
}
```

#### 5.2.4 批量重建索引
```
POST /api/novel/rag/rebuild-index

Body:
{
  "scope": "all" | "project" | "date_range",
  "project_id": "uuid",  # scope=project 时必填
  "start_date": "2025-01-01",  # scope=date_range 时必填
  "end_date": "2025-01-15"
}

Response:
{
  "success": true,
  "message": "批量重建任务已创建",
  "estimated_count": 45,
  "estimated_cost": 0.05,
  "estimated_time": "1-2 分钟"
}
```

#### 5.2.5 导出向量数据
```
POST /api/novel/rag/export

Body:
{
  "project_id": "uuid"  # 可选，不传则导出全部
}

Response:
{
  "success": true,
  "download_url": "/downloads/rag_backup_20250115.json",
  "file_size": 12345678,  # bytes
  "expires_at": "2025-01-15T20:00:00Z"
}
```

#### 5.2.6 导入向量数据
```
POST /api/novel/rag/import
Content-Type: multipart/form-data

Body:
- file: File (JSON 格式)

Response:
{
  "success": true,
  "message": "导入成功",
  "imported_count": 123,
  "skipped_count": 5,
  "errors": []
}
```

#### 5.2.7 数据清理
```
POST /api/novel/rag/cleanup

Body:
{
  "orphaned": true,  # 清理孤立索引
  "cache": true,     # 清理过期缓存
  "compress": false  # 压缩数据库
}

Response:
{
  "success": true,
  "orphaned_removed": 3,
  "cache_removed": 12,
  "space_freed": 1.7  # MB
}
```

#### 5.2.8 维护操作日志
```
GET /api/novel/rag/maintenance-logs?limit=20

Response:
{
  "logs": [
    {
      "id": "uuid",
      "timestamp": "2025-01-15T14:00:00Z",
      "operation": "export",
      "details": "全部项目 → backup.json",
      "status": "success",
      "user_id": "admin-uuid"
    }
  ]
}
```

#### 5.2.9 最近索引活动
```
GET /api/novel/rag/recent-activities?limit=10

Response:
{
  "activities": [
    {
      "timestamp": "2025-01-15T14:00:00Z",
      "project_name": "霸总的心头宝",
      "chapter_number": 5,
      "chapter_title": "表白",
      "status": "success"
    }
  ]
}
```

---

## 6. 数据模型

### 6.1 TypeScript 类型定义

```typescript
// 章节索引状态
export enum IndexStatus {
  INDEXED = "已索引",
  NEED_REBUILD = "需重建",
  NOT_INDEXED = "未索引"
}

// 章节索引记录
export interface ChapterIndexRecord {
  chapterId: string;
  projectId: string;
  projectName: string;
  chapterNumber: number;
  title: string;
  wordCount: number;
  indexedAt: string | null;
  updatedAt: string;
  status: IndexStatus;
}

// 一致性检查结果
export interface ConsistencyCheckResult {
  totalInPg: number;
  totalInChroma: number;
  notIndexed: ChapterIndexRecord[];
  orphaned: string[];
  needRebuild: ChapterIndexRecord[];
  healthScore: number;
}

// 系统统计
export interface RAGStats {
  enabled: boolean;
  collectionName: string;
  totalDocuments: number;
  embeddingModel: string;
  dbSize: number;
  indexSuccessRate: number;
  avgSimilarityScore: number;
}

// 维护日志
export interface MaintenanceLog {
  id: string;
  timestamp: string;
  operation: "export" | "import" | "rebuild" | "cleanup";
  details: string;
  status: "success" | "failed" | "partial";
  userId: string;
}

// 最近活动
export interface RecentActivity {
  timestamp: string;
  projectName: string;
  chapterNumber: number;
  chapterTitle: string;
  status: "success" | "failed";
}
```

---

## 7. 性能优化策略

### 7.1 前端优化

| 策略 | 实现方式 |
|------|---------|
| **数据缓存** | React Query 缓存表格数据，5 分钟过期 |
| **分页加载** | 默认每页 20 条，避免一次加载全部 |
| **防抖搜索** | 输入延迟 500ms 后触发请求 |
| **虚拟滚动** | 单页超过 100 条时使用虚拟列表 |
| **懒加载 Tab** | 只渲染当前激活的 Tab 内容 |

### 7.2 后端优化

| 策略 | 实现方式 |
|------|---------|
| **索引查询** | PostgreSQL 添加 `chapter_number` 索引 |
| **批量操作** | 使用 BackgroundTasks 异步执行 |
| **分页查询** | LIMIT + OFFSET，避免全表扫描 |
| **缓存统计** | 统计数据缓存 1 分钟 |

---

## 8. 安全与权限

### 8.1 权限控制

所有 API 端点都需要管理员权限：

```python
from ..middleware.auth import require_admin

@router.get("/chapters")
async def get_chapters(
    user_payload = Depends(require_admin)
):
    ...
```

### 8.2 操作审计

所有危险操作记录到审计日志：
- 导入/导出数据
- 批量删除索引
- 重建索引
- 数据清理

记录内容：
- 操作人（user_id）
- 操作时间
- 操作类型
- 影响范围
- 操作结果

### 8.3 二次确认

以下操作需要二次确认：
- 导入数据（覆盖现有索引）
- 批量删除索引
- 全量重建索引
- 数据清理（孤立索引）

---

## 9. 错误处理

### 9.1 前端错误处理

```typescript
try {
  const result = await fetch('/api/novel/rag/...');
  if (!result.ok) {
    throw new Error(`操作失败: ${result.statusText}`);
  }
} catch (error) {
  toast({
    variant: "destructive",
    title: "操作失败",
    description: error.message
  });
}
```

### 9.2 后端错误处理

```python
try:
    # 业务逻辑
    ...
except Exception as e:
    logger.error(f"操作失败: {str(e)}")
    raise HTTPException(
        status_code=500,
        detail=f"操作失败: {str(e)}"
    )
```

---

## 10. 测试计划

### 10.1 前端测试

- [ ] Tab 切换功能
- [ ] 表格排序、过滤、分页
- [ ] 批量操作（选中/取消）
- [ ] 对话框打开/关闭
- [ ] 错误提示显示

### 10.2 后端测试

- [ ] API 权限验证
- [ ] 分页查询正确性
- [ ] 一致性检查算法
- [ ] 导出/导入数据完整性
- [ ] 批量操作事务性

### 10.3 集成测试

- [ ] 端到端索引流程
- [ ] 一致性检查 → 修复流程
- [ ] 导出 → 导入流程
- [ ] 批量重建流程

---

## 11. 实施计划

### 11.1 阶段划分

**Phase 1: 后端 API（2-3 天）**
- [ ] 新增 9 个 API 端点
- [ ] 编写单元测试
- [ ] API 文档更新

**Phase 2: 前端基础（2-3 天）**
- [ ] 创建主页面和 Tab 容器
- [ ] 实现 Tab 1（系统概览）
- [ ] 实现 Tab 2（索引管理）

**Phase 3: 前端高级（2-3 天）**
- [ ] 实现 Tab 3（质量监控）
- [ ] 实现 Tab 4（运维工具）
- [ ] 优化交互体验

**Phase 4: 测试与优化（1-2 天）**
- [ ] 集成测试
- [ ] 性能优化
- [ ] 文档完善

**总计：7-11 天**

### 11.2 验收标准

- [x] 所有 Tab 功能正常
- [x] 表格支持排序、过滤、分页
- [x] 一致性检查能识别 3 类问题
- [x] 批量操作有二次确认
- [x] 导出/导入功能完整
- [x] 响应时间 < 2 秒
- [x] 移动端适配良好
- [x] 无 TypeScript 错误

---

## 12. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| ChromaDB API 变更 | 高 | 版本锁定，文档同步 |
| 大数据量性能问题 | 中 | 分页加载，虚拟滚动 |
| 一致性检查耗时长 | 中 | 异步执行，进度提示 |
| 导入数据损坏 | 高 | 格式验证，备份提示 |

---

## 13. 附录

### 13.1 参考文档

- [RAG_GUIDE.md](../../services/novel-backend/RAG_GUIDE.md) - RAG 系统使用指南
- [QUICKSTART_RAG.md](../../services/novel-backend/QUICKSTART_RAG.md) - 快速开始
- [Admin 页面风格指南](../admin/page.tsx) - 现有 Admin 样式

### 13.2 设计决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2025-01-15 | 选择 Tab 布局 | 功能多且逻辑关联，Tab 更清晰 |
| 2025-01-15 | 仅管理员访问 | RAG 是系统级功能，普通用户无需关心 |
| 2025-01-15 | 使用 TanStack Table | 功能强大，支持排序、过滤、分页 |
| 2025-01-15 | 表格式索引列表 | 数据密度高，操作便捷 |

---

**文档版本**: v1.0
**最后更新**: 2025-01-15
**状态**: ✅ 已确认，准备实施
