# Embedding 配置完整总结

## ✅ 已支持的配置项

### 1. Embedding 模型配置

```bash
# .env
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**支持的模型**:
- `text-embedding-3-small` ⭐ 推荐（性价比最高，便宜 80%）
- `text-embedding-ada-002` - 旧版（兼容性）
- `text-embedding-3-large` - 最强（准确度最高）

详见: [EMBEDDING_MODELS.md](./EMBEDDING_MODELS.md)

---

### 2. Embedding API Base URL 配置（新增）

```bash
# .env

# 可选：为 Embedding 配置独立的 API endpoint
OPENAI_EMBEDDING_API_BASE=https://your-embedding-endpoint/v1
```

**配置优先级**:
```
OPENAI_EMBEDDING_API_BASE (已设置) → 使用独立 Base URL
       ↓ (未设置)
OPENAI_API_BASE → 使用统一 Base URL
       ↓ (未设置)
默认值: https://api.openai.com/v1
```

详见: [EMBEDDING_API_CONFIG.md](./EMBEDDING_API_CONFIG.md)

---

## 🎯 完整配置示例

### 示例 1: 默认配置（推荐）

```bash
# .env
OPENAI_API_KEY=your-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4-turbo-preview

# Embedding 配置（可选，使用默认值即可）
# OPENAI_EMBEDDING_MODEL=text-embedding-3-small
# OPENAI_EMBEDDING_API_BASE 留空即可
```

**说明**: 不配置任何 Embedding 相关环境变量，系统自动使用最优配置。

---

### 示例 2: 自定义 Embedding 模型

```bash
# .env
OPENAI_API_KEY=your-key
OPENAI_API_BASE=https://api.openai.com/v1

# 使用更强的模型（追求极致准确度）
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

---

### 示例 3: 独立的 Embedding API

```bash
# .env
OPENAI_API_KEY=your-key

# Chat 使用官方 API
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4-turbo-preview

# Embedding 使用代理（更便宜）
OPENAI_EMBEDDING_API_BASE=https://proxy.example.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

---

### 示例 4: Azure OpenAI 混合部署

```bash
# .env
OPENAI_API_KEY=your-azure-key

# Chat 使用 Azure OpenAI
OPENAI_API_BASE=https://your-resource.openai.azure.com/openai/deployments/gpt-4
OPENAI_MODEL=gpt-4

# Embedding 使用官方 OpenAI（Azure Embedding 贵）
OPENAI_EMBEDDING_API_BASE=https://api.openai.com/v1
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

---

### 示例 5: 本地 Embedding 服务

```bash
# .env
OPENAI_API_KEY=your-key

# Chat 使用云端
OPENAI_API_BASE=https://api.openai.com/v1

# Embedding 使用本地服务（免费）
OPENAI_EMBEDDING_API_BASE=http://localhost:8080/v1
OPENAI_EMBEDDING_MODEL=custom-embedding-model
```

---

## 📊 配置对比

| 配置项 | 必填 | 默认值 | 影响范围 |
|--------|------|--------|----------|
| `OPENAI_API_KEY` | ✅ | 无 | 所有 OpenAI API 调用 |
| `OPENAI_API_BASE` | ❌ | `https://api.openai.com/v1` | Chat Completion |
| `OPENAI_MODEL` | ❌ | `gpt-4-turbo-preview` | 文本生成 |
| `OPENAI_EMBEDDING_MODEL` | ❌ | `text-embedding-3-small` | Embedding 生成 |
| `OPENAI_EMBEDDING_API_BASE` | ❌ | 同 `OPENAI_API_BASE` | Embedding API 调用 |

---

## 🔍 验证配置

### 方法 1: 查看启动日志

```bash
uvicorn app.main:app --reload
```

预期输出:
```
✅ 向量服务初始化成功 -
   Collection: novel_chapters,
   文档数: 0,
   API Base: https://your-configured-url/v1
```

### 方法 2: 调用 API

```bash
curl http://localhost:8000/api/novel/rag/stats
```

响应:
```json
{
  "enabled": true,
  "collection_name": "novel_chapters",
  "total_documents": 0,
  "embedding_model": "text-embedding-3-small"
}
```

### 方法 3: 运行测试

```bash
python test_rag.py
```

查看测试输出，确认 Embedding 正常生成。

---

## ⚙️ 常见配置场景

### 场景 1: 个人开发者（官方 API）

```bash
# 最简配置
OPENAI_API_KEY=your-key
```

其他全部使用默认值。

---

### 场景 2: 企业用户（使用代理）

```bash
OPENAI_API_KEY=your-key

# Chat 使用高性能代理
OPENAI_API_BASE=https://proxy-premium.company.com/v1

# Embedding 使用经济型代理
OPENAI_EMBEDDING_API_BASE=https://proxy-eco.company.com/v1
```

**优势**: 分别优化成本和性能。

---

### 场景 3: 数据安全要求（混合云）

```bash
OPENAI_API_KEY=your-key

# Chat 使用公有云
OPENAI_API_BASE=https://api.openai.com/v1

# Embedding 使用私有云（数据不出内网）
OPENAI_EMBEDDING_API_BASE=https://internal.company.com/v1
```

---

### 场景 4: 成本优化（本地 Embedding）

```bash
OPENAI_API_KEY=your-key
OPENAI_API_BASE=https://api.openai.com/v1

# Embedding 使用本地开源模型（免费）
OPENAI_EMBEDDING_API_BASE=http://localhost:8080/v1
OPENAI_EMBEDDING_MODEL=sentence-transformers
```

**节省**: Embedding 成本降为 $0！

---

## 📚 相关文档

| 文档 | 内容 |
|------|------|
| [EMBEDDING_MODELS.md](./EMBEDDING_MODELS.md) | 模型详细对比 |
| [EMBEDDING_API_CONFIG.md](./EMBEDDING_API_CONFIG.md) | API Base URL 配置指南 |
| [RAG_GUIDE.md](./RAG_GUIDE.md) | RAG 完整使用指南 |
| [SUMMARY.md](./SUMMARY.md) | 系统总结 |

---

## ✅ 配置清单

使用前请确认：

- [ ] `OPENAI_API_KEY` 已设置
- [ ] `OPENAI_EMBEDDING_MODEL` 已选择（或使用默认）
- [ ] `OPENAI_EMBEDDING_API_BASE` 已配置（如需独立 endpoint）
- [ ] 启动日志显示正确的 API Base
- [ ] 测试脚本运行通过

---

**更新时间**: 2026-01-15
**版本**: v1.1.0（新增 API Base URL 独立配置）
**维护者**: Claude (Antigravity)
