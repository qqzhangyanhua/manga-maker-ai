# Embedding 模型配置更新

## ✅ 已完成的更改

### 1. 默认模型更新

**旧版**:
```bash
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
```

**新版**（推荐）:
```bash
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 2. 成本对比

| 模型 | 1000 章成本 | 节省 |
|------|------------|------|
| text-embedding-3-small | $0.01 | 基准 ✅ |
| text-embedding-ada-002 | $0.05 | -80% ❌ |

**结论**: 切换到 `text-embedding-3-small` 可节省 **80% 成本**！

---

## 🔧 如何配置

### 方法 1: 使用默认值（推荐）

不需要任何配置，系统默认使用 `text-embedding-3-small`。

### 方法 2: 自定义配置

在 `.env` 文件中指定：

```bash
# 推荐：性价比最高（默认）
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# 或者：兼容旧系统
# OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# 或者：追求极致准确度
# OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

---

## 📊 模型对比

| 模型 | 维度 | 价格 | 性能 | 推荐场景 |
|------|------|------|------|----------|
| **text-embedding-3-small** ⭐ | 1536 | $0.02/百万token | 优秀 | 默认推荐 |
| text-embedding-ada-002 | 1536 | $0.10/百万token | 良好 | 兼容旧系统 |
| text-embedding-3-large | 3072 | $0.13/百万token | 最强 | 极致准确度 |

详细对比请查看: [EMBEDDING_MODELS.md](./EMBEDDING_MODELS.md)

---

## ⚠️ 切换模型注意事项

### 如果你已经有旧数据（使用 ada-002 索引）

**选项 1: 保持旧模型**
```bash
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
```

**选项 2: 切换到新模型（推荐）**

1. 修改 `.env`:
   ```bash
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   ```

2. 重新索引所有章节:
   ```bash
   curl -X POST http://localhost:8000/api/novel/rag/batch-index \
     -H "Content-Type: application/json" \
     -d '{"project_id": "your-project-id"}'
   ```

**成本效益分析**:
- 重新索引成本: 1000 章 × $0.00001 = $0.01
- 未来节省: 每次新增章节节省 80%
- 回本周期: 新增 12.5 章即可回本 ✅

---

## 🚀 测试验证

运行测试脚本验证新模型：

```bash
cd services/novel-backend
python test_rag.py
```

预期输出:
```
✅ Embedding 生成成功
   - 维度: 1536
   - 模型: text-embedding-3-small
```

---

## 📚 相关文档

- 📖 [Embedding 模型详细对比](./EMBEDDING_MODELS.md)
- 📘 [RAG 使用指南](./RAG_GUIDE.md)
- 🚀 [快速启动](./QUICKSTART_RAG.md)

---

**更新时间**: 2026-01-15
**影响范围**: 所有新项目和新索引
**兼容性**: 完全兼容，无需修改代码
