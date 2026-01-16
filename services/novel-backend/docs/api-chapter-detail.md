# API 文档: 获取单章索引详情

## 端点信息

**URL**: `GET /api/novel/rag/chapter/{chapter_id}/detail`

**功能**: 获取指定章节在向量数据库中的索引详情

**认证**: 需要 JWT Token

## 路径参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `chapter_id` | string | 是 | 章节 UUID |

## 请求示例

```bash
curl -X GET "http://localhost:8000/api/novel/rag/chapter/{chapter_id}/detail" \
  -H "Authorization: Bearer {token}"
```

## 响应格式

### 成功响应 (已索引)

**状态码**: `200 OK`

```json
{
  "chapter_id": "uuid-string",
  "indexed": true,
  "metadata": {
    "project_id": "uuid-string",
    "chapter_number": 1,
    "title": "第一章：开始",
    "indexed_at": "2025-01-15T12:00:00Z"
  },
  "embedding_dim": 1536,
  "similarity_test": 1.0
}
```

### 成功响应 (未索引)

**状态码**: `200 OK`

```json
{
  "chapter_id": "uuid-string",
  "indexed": false
}
```

### 成功响应 (ChromaDB 错误)

**状态码**: `200 OK`

```json
{
  "chapter_id": "uuid-string",
  "indexed": false,
  "error": "ChromaDB connection failed"
}
```

### 错误响应

**章节不存在**

**状态码**: `404 Not Found`

```json
{
  "detail": "章节不存在"
}
```

**未授权**

**状态码**: `401 Unauthorized`

```json
{
  "detail": "未登录"
}
```

**服务器错误**

**状态码**: `500 Internal Server Error`

```json
{
  "detail": "获取章节详情失败: {error_message}"
}
```

## 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `chapter_id` | string | 章节 UUID |
| `indexed` | boolean | 是否已在向量数据库中索引 |
| `metadata` | object | 索引元数据 (仅 indexed=true 时存在) |
| `metadata.project_id` | string | 项目 UUID |
| `metadata.chapter_number` | integer | 章节序号 |
| `metadata.title` | string | 章节标题 |
| `metadata.indexed_at` | string | 索引时间 (ISO 8601) |
| `embedding_dim` | integer | 向量维度 (仅 indexed=true 时存在) |
| `similarity_test` | float | 自身相似度测试结果 (应为 1.0) |
| `error` | string | 错误信息 (仅在查询 ChromaDB 失败时存在) |

## 业务逻辑

1. **权限验证**: 验证用户 JWT Token
2. **章节验证**: 检查章节是否存在于 PostgreSQL 数据库
   - 如果不存在: 返回 `404 Not Found`
3. **向量服务检查**: 检查向量服务是否启用
   - 如果未启用: 返回 `indexed: false`
4. **查询 ChromaDB**: 从向量数据库获取章节索引数据
   - 如果找到: 返回完整索引信息 (metadata, embedding_dim, similarity_test)
   - 如果未找到: 返回 `indexed: false`
   - 如果查询失败: 返回 `indexed: false` 和错误信息

## 使用场景

1. **索引状态检查**: 在 RAG 管理页面查看章节是否已索引
2. **调试工具**: 查看向量维度和元数据是否正确
3. **质量验证**: 通过 similarity_test 验证索引质量 (应为 1.0)

## 测试

运行测试脚本:

```bash
cd services/novel-backend
python test_chapter_detail_api.py
```

## 相关 API

- `GET /api/novel/rag/chapters` - 获取章节索引列表
- `POST /api/novel/rag/index-chapter` - 索引单个章节
- `DELETE /api/novel/rag/chapter/{chapter_id}` - 删除章节索引

## 变更历史

- **2025-01-16**: 初始实现 (Task 2)
