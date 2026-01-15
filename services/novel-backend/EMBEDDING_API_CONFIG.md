# Embedding API 独立配置指南

## 概述

支持为 Embedding API 配置独立的 Base URL，适用于以下场景：
1. Chat Completion 和 Embedding 使用不同的 API endpoint
2. 使用不同的代理服务器
3. 使用第三方兼容服务（如 Azure OpenAI）

---

## 配置方法

### 方法 1: 使用相同的 API Base（默认）

如果 Chat 和 Embedding 使用同一个 endpoint，只需配置：

```bash
# .env
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://api.openai.com/v1
```

此时 Embedding 会自动使用 `OPENAI_API_BASE`。

---

### 方法 2: 使用独立的 Embedding API Base

如果需要为 Embedding 配置不同的 endpoint：

```bash
# .env
# Chat Completion API
OPENAI_API_KEY=your-api-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4-turbo-preview

# Embedding API（独立配置）
OPENAI_EMBEDDING_API_BASE=https://embedding.your-proxy.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

---

## 使用场景示例

### 场景 1: 使用不同的代理服务器

```bash
# Chat 使用国内代理 A
OPENAI_API_BASE=https://proxy-a.cn/v1

# Embedding 使用国内代理 B（更便宜）
OPENAI_EMBEDDING_API_BASE=https://proxy-b.cn/v1
```

**适用**: 不同代理商的价格策略不同，可以优化成本。

---

### 场景 2: Azure OpenAI Service

```bash
# Chat Completion 使用 Azure
OPENAI_API_BASE=https://your-resource.openai.azure.com/openai/deployments/gpt-4
OPENAI_API_KEY=your-azure-key

# Embedding 使用官方 OpenAI（Azure Embedding 可能贵）
OPENAI_EMBEDDING_API_BASE=https://api.openai.com/v1
```

---

### 场景 3: 本地 Embedding 服务

```bash
# Chat 使用 OpenAI
OPENAI_API_BASE=https://api.openai.com/v1

# Embedding 使用本地服务（免费）
OPENAI_EMBEDDING_API_BASE=http://localhost:8080/v1
OPENAI_EMBEDDING_MODEL=custom-embedding-model
```

**适用**: 使用开源 Embedding 模型（如 `sentence-transformers`）节省成本。

---

### 场景 4: 混合云部署

```bash
# Chat 使用公有云
OPENAI_API_BASE=https://api.openai.com/v1

# Embedding 使用私有云（数据安全）
OPENAI_EMBEDDING_API_BASE=https://internal-embedding.company.com/v1
```

**适用**: 企业对数据安全有要求，Embedding 数据不出内网。

---

## 验证配置

### 1. 检查日志

启动服务后查看日志：

```
✅ 向量服务初始化成功 -
   Collection: novel_chapters,
   文档数: 0,
   API Base: https://embedding.your-proxy.com/v1
```

如果 `API Base` 显示的是你配置的独立 URL，说明配置成功。

### 2. 测试 Embedding 生成

```bash
cd services/novel-backend
python test_rag.py
```

查看测试输出，确认 Embedding 正常生成。

---

## 配置优先级

```
OPENAI_EMBEDDING_API_BASE (已设置) → 使用独立 Base URL
       ↓ (未设置)
OPENAI_API_BASE → 使用统一 Base URL
       ↓ (未设置)
默认值: https://api.openai.com/v1
```

---

## 常见问题

### Q1: 如果只设置了 `OPENAI_API_BASE`，会影响 Embedding 吗？

✅ **不会**。如果没有设置 `OPENAI_EMBEDDING_API_BASE`，Embedding 会自动使用 `OPENAI_API_BASE`。

### Q2: 可以为 Chat 和 Embedding 使用不同的 API Key 吗？

❌ **当前不支持**。两者共用 `OPENAI_API_KEY`。如果需要不同的 Key，请在代理层面处理。

### Q3: 如何知道 Embedding 正在使用哪个 Base URL？

查看服务启动日志中的 `API Base` 字段，或调用：

```bash
curl http://localhost:8000/api/novel/rag/stats
```

### Q4: 切换 Base URL 需要重新索引吗？

❌ **不需要**。Base URL 只影响 API 调用路径，不影响向量数据。

---

## 推荐配置

### 个人开发者（使用官方 API）

```bash
# 无需额外配置
OPENAI_API_BASE=https://api.openai.com/v1
# OPENAI_EMBEDDING_API_BASE 留空即可
```

### 企业用户（使用代理）

```bash
# Chat 使用高性能代理
OPENAI_API_BASE=https://proxy-premium.company.com/v1

# Embedding 使用经济型代理
OPENAI_EMBEDDING_API_BASE=https://proxy-eco.company.com/v1
```

### 混合部署（本地 + 云端）

```bash
# Chat 使用云端（质量优先）
OPENAI_API_BASE=https://api.openai.com/v1

# Embedding 使用本地（成本优先）
OPENAI_EMBEDDING_API_BASE=http://localhost:8080/v1
```

---

## 兼容性说明

### 支持的 API 格式

只要服务兼容 OpenAI API 格式，即可使用：

- ✅ OpenAI 官方 API
- ✅ Azure OpenAI Service
- ✅ 第三方代理服务
- ✅ 本地部署的兼容服务（如 LocalAI）

### 请求格式

Embedding 请求会发送到：

```
POST {OPENAI_EMBEDDING_API_BASE}/embeddings
Content-Type: application/json

{
  "model": "text-embedding-3-small",
  "input": "your text here"
}
```

确保你的 endpoint 支持这个格式。

---

## 故障排查

### 问题 1: Embedding 调用失败

**错误**: `Connection refused` 或 `404 Not Found`

**检查**:
1. `OPENAI_EMBEDDING_API_BASE` 是否正确
2. endpoint 是否可访问（`curl` 测试）
3. 路径是否包含 `/v1`（某些代理需要）

### 问题 2: 认证失败

**错误**: `401 Unauthorized`

**检查**:
1. `OPENAI_API_KEY` 是否正确
2. 代理服务是否需要不同的认证方式

### 问题 3: 模型不支持

**错误**: `Model not found`

**检查**:
1. endpoint 是否支持 `OPENAI_EMBEDDING_MODEL` 指定的模型
2. 某些代理可能只支持特定模型

---

## 示例配置模板

### 模板 1: 官方 API（默认）

```bash
OPENAI_API_KEY=sk-your-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 模板 2: Azure OpenAI

```bash
OPENAI_API_KEY=your-azure-key
OPENAI_API_BASE=https://your-resource.openai.azure.com/openai/deployments/gpt-4

# Embedding 使用官方 OpenAI（更便宜）
OPENAI_EMBEDDING_API_BASE=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 模板 3: 国内代理

```bash
OPENAI_API_KEY=your-key
OPENAI_API_BASE=https://proxy-chat.cn/v1

# Embedding 使用不同代理（优化成本）
OPENAI_EMBEDDING_API_BASE=https://proxy-embedding.cn/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

---

## 总结

| 配置项 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `OPENAI_API_BASE` | 否 | `https://api.openai.com/v1` | Chat Completion Base URL |
| `OPENAI_EMBEDDING_API_BASE` | 否 | 同 `OPENAI_API_BASE` | Embedding Base URL（可选） |

**推荐**: 如无特殊需求，只配置 `OPENAI_API_BASE` 即可。

---

**更新时间**: 2026-01-15
**相关文档**: [RAG_GUIDE.md](./RAG_GUIDE.md), [EMBEDDING_MODELS.md](./EMBEDDING_MODELS.md)
