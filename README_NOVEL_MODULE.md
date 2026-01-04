# AI 小说创作模块集成文档

## 📚 概述

本模块为 manga-maker-ai 项目集成了完整的 AI 小说创作功能，包括：
- 小说项目管理
- 章节大纲编辑
- AI 辅助写作（基于 RAG 的上下文增强）
- 多版本内容对比
- Prompt 模板库

## 🏗️ 架构设计

### 技术栈
- **前端**: Next.js 15 + React + TypeScript + shadcn/ui
- **后端**: Python FastAPI（独立微服务）
- **数据库**: PostgreSQL（与漫画功能共享）
- **AI 服务**: OpenAI API
- **RAG 实现**: 结构化数据 + PostgreSQL 全文搜索（无需向量数据库）

### 目录结构
```
manga-maker-ai/
├── src/
│   ├── app/
│   │   ├── (novel)/novel/          # 小说模块前端页面
│   │   │   ├── page.tsx             # 项目列表
│   │   │   ├── [id]/page.tsx        # 项目详情
│   │   │   └── components/          # React 组件
│   │   └── api/novel/[...path]/     # API 代理层
│   └── lib/                         # 工具函数
├── services/
│   └── novel-backend/               # Python 后端服务
│       ├── app/
│       │   ├── routers/             # API 路由
│       │   ├── services/            # 业务逻辑
│       │   │   ├── rag_service.py   # RAG 检索服务
│       │   │   └── generation_service.py  # AI 生成服务
│       │   ├── models.py            # SQLAlchemy 模型
│       │   └── main.py              # FastAPI 应用
│       ├── requirements.txt
│       └── Dockerfile
├── prisma/
│   └── schema.prisma                # 扩展的数据模型
└── docker-compose.yml               # 容器编排配置
```

## 🚀 快速开始

### 1. 环境配置

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下关键变量：
```env
# 数据库
DATABASE_URL=postgresql://manga:manga123@localhost:5432/manga

# JWT Secret（与 Next.js 共享）
AUTH_SECRET=your-secret-key

# OpenAI API
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4-turbo-preview

# 小说后端服务
NOVEL_SERVICE_URL=http://localhost:8000
```

### 2. 数据库迁移

运行 Prisma 迁移：
```bash
npx prisma generate
npx prisma migrate dev
```

或手动执行 SQL：
```bash
psql $DATABASE_URL < prisma/migrations/add_novel_module/migration.sql
```

### 3. 启动服务

#### 方式 A: Docker Compose（推荐）
```bash
docker-compose up -d
```

这将启动：
- PostgreSQL (端口 5432)
- MinIO (端口 9000)
- Redis (端口 6379)
- Novel Backend (端口 8000)

#### 方式 B: 本地开发

**启动 Python 后端**:
```bash
cd services/novel-backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**启动 Next.js 前端**:
```bash
pnpm install
pnpm dev
```

### 4. 访问应用

- **小说创作模块**: http://localhost:3000/novel
- **Python 后端 API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

## 📖 核心功能说明

### 1. 结构化数据 RAG

**设计理念**：无需向量数据库，利用 PostgreSQL 原生能力实现轻量级 RAG。

**实现策略**：
```python
# services/novel-backend/app/services/rag_service.py

async def build_context_for_generation(
    project_id: str,
    chapter_number: int,
    chapter_outline: str
) -> str:
    """
    构建章节生成的完整上下文
    
    策略：
    1. 获取项目的世界观和角色设定（JSON 字段）
    2. 获取前 2 个章节内容（连续性）
    3. 检索相关章节（关键词匹配 + 关键章节优先）
    4. 拼接成结构化 Prompt
    """
    # 1. 世界观 + 角色
    project = await get_project(project_id)
    
    # 2. 前序章节
    previous_chapters = await get_previous_chapters(project_id, chapter_number, count=2)
    
    # 3. RAG 检索（使用 PostgreSQL ILIKE）
    relevant_chapters = await search_relevant_chapters(
        project_id, 
        chapter_outline, 
        current_chapter_number=chapter_number,
        k=3
    )
    
    # 4. 拼接上下文
    return format_context(project, previous_chapters, relevant_chapters, chapter_outline)
```

**检索优化**：
- 优先检索标记为 `is_key_chapter=True` 的章节
- 使用 PostgreSQL 的 `ILIKE` 进行关键词匹配
- 可升级为 `ts_vector` 全文搜索（生产环境）

### 2. 流式 AI 生成

**前端消费 SSE**：
```typescript
// src/app/(novel)/novel/[id]/components/ChapterEditor.tsx

const response = await fetch("/api/novel/chapters/generate/stream", {
  method: "POST",
  body: JSON.stringify({ chapter_id, use_rag: true }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.substring(6);
      if (data === "[DONE]") break;
      setContent(prev => prev + data);  // 实时更新
    }
  }
}
```

### 3. API 代理层

**统一认证和错误处理**：
```typescript
// src/app/api/novel/[...path]/route.ts

export async function POST(req: NextRequest, { params }) {
  // 1. 从 Next.js session 获取 JWT token
  const token = await getAuthToken(req);
  
  // 2. 转发到 Python 服务
  const targetUrl = `${NOVEL_SERVICE_URL}/api/novel/${params.path.join("/")}`;
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: await req.text(),
  });
  
  // 3. 处理流式响应
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    return new Response(response.body, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }
  
  return NextResponse.json(await response.json());
}
```

## 🔧 开发指南

### 添加新的 API 端点

**1. Python 后端**：
```python
# services/novel-backend/app/routers/new_feature.py
from fastapi import APIRouter, Depends
from ..middleware.auth import get_current_user_id

router = APIRouter(prefix="/new-feature", tags=["new-feature"])

@router.post("")
async def create_feature(
    data: FeatureCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    # 业务逻辑
    pass
```

**2. 注册路由**：
```python
# services/novel-backend/app/main.py
from .routers import new_feature

app.include_router(new_feature.router)
```

**3. 前端调用**：
```typescript
const response = await fetch("/api/novel/new-feature", {
  method: "POST",
  body: JSON.stringify(data),
});
```

### 扩展 RAG 检索策略

```python
# services/novel-backend/app/services/rag_service.py

async def search_with_semantic_similarity(
    self,
    project_id: str,
    query: str,
    k: int = 5
) -> List[Dict]:
    """
    升级为语义相似度检索（可选）
    
    方案：
    1. 使用 PostgreSQL pgvector 扩展
    2. 或集成 OpenAI Embeddings API
    3. 或使用 sentence-transformers
    """
    # 示例：使用 OpenAI Embeddings
    query_embedding = await get_embedding(query)
    
    # 使用 pgvector 的余弦相似度搜索
    results = await self.db.execute(
        text("""
            SELECT * FROM novel_chapters
            WHERE project_id = :project_id
            ORDER BY embedding <=> :query_embedding
            LIMIT :k
        """),
        {"project_id": project_id, "query_embedding": query_embedding, "k": k}
    )
    
    return results.fetchall()
```

## 📊 数据模型

### 核心表结构

```sql
-- 小说项目
novel_projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(200),
  description TEXT,
  genre VARCHAR(50),
  world_setting JSONB,      -- 世界观（JSON）
  characters JSONB,          -- 角色列表（JSON）
  target_words INT,
  status VARCHAR(50),
  total_words INT DEFAULT 0,
  chapter_count INT DEFAULT 0
)

-- 小说章节
novel_chapters (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES novel_projects(id),
  chapter_number INT NOT NULL,
  title VARCHAR(200),
  outline TEXT,              -- 大纲（用于 RAG）
  content TEXT,              -- 完整内容
  word_count INT DEFAULT 0,
  is_key_chapter BOOLEAN,    -- 关键章节标记
  status VARCHAR(50)
)

-- 章节版本（多版本对比）
novel_chapter_versions (
  id UUID PRIMARY KEY,
  chapter_id UUID REFERENCES novel_chapters(id),
  version_number INT,
  content TEXT NOT NULL,
  is_selected BOOLEAN,
  user_rating INT
)
```

## 🐛 故障排查

### 问题 1: Python 服务无法连接数据库

**症状**: `sqlalchemy.exc.OperationalError: could not connect to server`

**解决方案**:
```bash
# 检查 DATABASE_URL 格式
echo $DATABASE_URL

# 确保 PostgreSQL 正在运行
docker-compose ps postgres

# 测试连接
psql $DATABASE_URL -c "SELECT 1"
```

### 问题 2: JWT 认证失败

**症状**: `401 Unauthorized`

**解决方案**:
```bash
# 确保 Next.js 和 Python 使用相同的 JWT_SECRET
grep AUTH_SECRET .env
grep JWT_SECRET services/novel-backend/.env

# 检查 token 是否正确传递
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/health
```

### 问题 3: AI 生成失败

**症状**: `OpenAI API error`

**解决方案**:
```bash
# 检查 API Key
echo $OPENAI_API_KEY

# 测试 API 连接
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 查看后端日志
docker-compose logs novel-backend
```

## 🔐 安全注意事项

1. **JWT Secret**: 生产环境必须使用强随机字符串
2. **API Key**: 永远不要将 OpenAI API Key 提交到代码库
3. **数据库**: 生产环境启用 SSL 连接
4. **CORS**: 限制允许的来源域名
5. **用户配额**: 防止滥用，设置合理的每日限制

## 📈 性能优化建议

1. **数据库索引**: 已为常用查询添加索引
2. **连接池**: SQLAlchemy 配置了连接池（pool_size=10）
3. **缓存**: 可选集成 Redis 缓存热门章节
4. **CDN**: 将生成的内容存储到 MinIO 并配置 CDN
5. **异步处理**: 长时间生成任务可改为后台队列

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本模块遵循项目主许可证。

## 📞 支持

如有问题，请：
1. 查看本文档的故障排查部分
2. 提交 Issue 到 GitHub
3. 联系项目维护者

---

**Happy Writing! 🎉**
