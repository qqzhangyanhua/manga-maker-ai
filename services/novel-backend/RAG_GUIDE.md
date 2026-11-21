# RAG 向量检索系统使用指南

## 概述

本项目使用 **ChromaDB + OpenAI Embeddings** 实现生产级 RAG（检索增强生成）系统，支持语义检索和自动降级到关键词匹配。

## 核心特性

- **真正的语义检索**: 使用 OpenAI `text-embedding-ada-002` 实现语义理解
- **自动降级容错**: ChromaDB 不可用时自动降级到 PostgreSQL 关键词匹配
- **异步索引**: 章节创建/更新时后台异步向量化
- **成本优化**: 每章节约 0.0001 USD，1000 章节仅 0.1 USD

---

## 快速开始

### 1. 安装依赖

```bash
cd services/novel-backend
pip install -r requirements.txt
```

新增依赖：
- `chromadb==0.4.22` - 向量数据库
- `tiktoken==0.5.2` - Token 计数（Embedding 用）

### 2. 配置环境变量

在 `.env` 文件中添加：

```bash
# OpenAI Embedding 配置
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# 向量数据库配置
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION_NAME=novel_chapters
RAG_TOP_K=3
RAG_ENABLE_VECTOR_SEARCH=true
```

**关键配置说明**：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-ada-002` | Embedding 模型 |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | 向量数据库存储路径 |
| `CHROMA_COLLECTION_NAME` | `novel_chapters` | Collection 名称 |
| `RAG_TOP_K` | `3` | 检索返回的章节数量 |
| `RAG_ENABLE_VECTOR_SEARCH` | `true` | 是否启用向量检索（`false` 则只用关键词） |

### 3. 启动服务

```bash
uvicorn app.main:app --reload
```

进程内测试不启动上面的服务，也不连接真实数据库或模型。在 `services/novel-backend` 执行 `pip install -r requirements-dev.txt`，然后 `pytest`。收集范围只有 `tests/`。

启动日志示例：

```
🚀 Novel Backend Service 启动
📊 数据库: postgres:5432/manga
🤖 AI 模型: gpt-4-turbo-preview
🔍 RAG 向量服务已启用 - Collection: novel_chapters, 文档数: 0, Embedding: text-embedding-ada-002
```

如果向量服务未启用，会显示：
```
⚠️ RAG 向量服务未启用，将使用关键词匹配降级模式
```

---

## API 使用

### 1. 索引单个章节

**POST** `/api/novel/rag/index-chapter`

```json
{
  "chapter_id": "chapter-uuid"
}
```

**响应**：
```json
{
  "success": true,
  "message": "章节索引任务已创建",
  "chapter_id": "chapter-uuid"
}
```

**说明**：
- 自动验证章节所属权限
- 后台异步执行向量化（约 0.5-1 秒）
- 幂等操作（重复索引会覆盖旧数据）

### 2. 批量索引项目章节

**POST** `/api/novel/rag/batch-index`

```json
{
  "project_id": "project-uuid",
  "chapter_ids": ["id1", "id2"]  // 可选，不传则索引所有章节
}
```

**响应**：
```json
{
  "success": true,
  "message": "批量索引任务已创建",
  "count": 10,
  "project_id": "project-uuid"
}
```

**适用场景**：
- 新项目初次启用 RAG
- 批量重建索引
- 迁移现有数据

### 3. 删除章节索引

**DELETE** `/api/novel/rag/chapter/{chapter_id}`

**响应**：
```json
{
  "success": true,
  "message": "章节索引已删除",
  "chapter_id": "chapter-uuid"
}
```

### 4. 查看 RAG 统计信息

**GET** `/api/novel/rag/stats`

**响应**：
```json
{
  "enabled": true,
  "collection_name": "novel_chapters",
  "total_documents": 150,
  "embedding_model": "text-embedding-ada-002"
}
```

---

## 工作原理

### 检索策略（混合模式）

```
用户请求生成章节
   ↓
RAG 服务接收请求
   ↓
策略 1: 尝试向量检索 (优先)
   ├─ 成功 → 返回语义相似章节（带相似度分数）
   └─ 失败 → 降级到策略 2
   ↓
策略 2: 关键词匹配 (降级)
   └─ PostgreSQL ILIKE 匹配
   ↓
返回相关章节 + 构建上下文
```

### 向量检索流程

1. **索引阶段**（章节创建/更新时）
   ```
   章节数据 → 拼接（标题 + 大纲 + 内容摘要）
       ↓
   OpenAI Embedding API
       ↓
   1536 维向量
       ↓
   存储到 ChromaDB
   ```

2. **检索阶段**（生成章节时）
   ```
   当前章节大纲 → Embedding → 向量查询
       ↓
   ChromaDB 余弦相似度检索
       ↓
   Top-K 相似章节（带相似度分数）
       ↓
   合并数据库元数据 → 返回完整章节信息
   ```

### 日志示例

**向量检索成功**：
```
🔍 向量检索成功 - 项目: abc-123, 结果数: 3, 平均相似度: 0.87
📋 上下文构建成功 - 上下文长度: 1500 字符, 检索模式: 🔍向量
```

**降级到关键词匹配**：
```
⚠️ 向量检索失败，降级到关键词匹配: Connection refused
📝 使用关键词匹配模式
📝 关键词匹配完成 - 结果数: 2
📋 上下文构建成功 - 检索模式: 📝关键词
```

---

## 最佳实践

### 1. 何时索引章节？

**推荐策略**：

- ✅ **新建章节后立即索引**（自动触发）
- ✅ **章节内容重大修改后重新索引**
- ✅ **新项目导入后批量索引**
- ❌ 不需要每次编辑小改动都重新索引

**自动化方案**（未来优化）：
```python
# 章节创建/更新时自动触发索引
@router.post("/chapters")
async def create_chapter(...):
    chapter = create_chapter_in_db(...)

    # 自动索引
    background_tasks.add_task(
        get_vector_service().index_chapter,
        chapter_id=str(chapter.id),
        ...
    )
```

### 2. 成本优化

**Embedding 成本**（OpenAI `text-embedding-ada-002`）：

- 每 1000 tokens: $0.0001
- 平均每章节 500 tokens（中文约 1000 字）
- **每章节索引成本: ~$0.00005**

**示例**：
- 100 章小说 = $0.005（5 分钱）
- 1000 章长篇 = $0.05（5 毛钱）

**降低成本技巧**：
1. 只索引关键章节（设置 `is_key_chapter=True`）
2. 内容摘要限制在 1000 字以内
3. 使用本地 Embedding 模型（如 `sentence-transformers`，免费但效果略差）

### 3. 性能优化

**ChromaDB 模式选择**：

- **SQLite 模式**（当前）: 单机部署，数据持久化到本地文件
- **Server 模式**（生产推荐）: 独立服务，支持多实例共享

**升级到 Server 模式**：
```python
# 修改 vector_service.py
from chromadb import HttpClient

self.client = HttpClient(
    host="chroma-server",
    port=8000
)
```

**Docker Compose 部署**：
```yaml
services:
  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
```

---

## 故障排查

### 问题 1: 向量服务未启用

**现象**：
```
⚠️ RAG 向量服务未启用，将使用关键词匹配降级模式
```

**原因排查**：
1. 检查 `.env` 中 `RAG_ENABLE_VECTOR_SEARCH=true`
2. 检查 `OPENAI_API_KEY` 是否正确
3. 查看日志中的详细错误信息

**手动测试**：
```python
from app.services.vector_service import get_vector_service

vs = get_vector_service()
print(vs.enabled)  # 应为 True
print(vs.get_stats())
```

### 问题 2: Embedding 生成失败

**现象**：
```
❌ 生成 Embedding 失败: Rate limit exceeded
```

**解决方案**：
1. 检查 OpenAI API 余额
2. 降低并发索引速度
3. 使用批量 Embedding API（最多 2048 个文本/请求）

### 问题 3: ChromaDB 初始化失败

**现象**：
```
❌ 向量服务初始化失败: [Errno 13] Permission denied: './chroma_db'
```

**解决方案**：
```bash
mkdir -p ./chroma_db
chmod 755 ./chroma_db
```

---

## 监控与维护

### 1. 查看索引状态

```bash
curl http://localhost:8000/api/novel/rag/stats
```

### 2. 重建索引

**场景**：Embedding 模型升级、数据损坏

```bash
# 删除旧索引
rm -rf ./chroma_db

# 批量重新索引
curl -X POST http://localhost:8000/api/novel/rag/batch-index \
  -H "Content-Type: application/json" \
  -d '{"project_id": "your-project-id"}'
```

### 3. 日志监控关键指标

```bash
# 查看检索成功率
grep "向量检索成功" logs/app.log | wc -l
grep "降级到关键词匹配" logs/app.log | wc -l

# 查看平均相似度
grep "平均相似度" logs/app.log
```

---

## 未来优化方向

### 1. 自动索引
- [ ] 章节创建/更新时自动触发索引
- [ ] WebSocket 实时反馈索引进度

### 2. 高级检索
- [ ] 支持混合检索（向量 + BM25）
- [ ] 支持重排序（Reranking）

### 3. 模型升级
- [ ] 支持 `text-embedding-3-small`（更便宜）
- [ ] 支持本地 Embedding 模型（完全免费）

### 4. 多租户隔离
- [ ] 每个项目独立 Collection
- [ ] 支持跨项目检索

---

## 技术栈

- **向量数据库**: ChromaDB 0.4.22
- **Embedding**: OpenAI `text-embedding-ada-002` (1536 维)
- **检索算法**: 余弦相似度（Cosine Similarity）
- **降级策略**: PostgreSQL ILIKE 关键词匹配

---

## 相关文档

- [ChromaDB 官方文档](https://docs.trychroma.com/)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [API 完整文档](./API_DOCUMENTATION.md)
- [日志规范](./LOGGING_GUIDE.md)
