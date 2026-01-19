"""
FastAPI 主应用
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import settings
from .routers import (
    chapters,
    inspiration,
    search,
    export,
    batch,
    versions,
    progressive,
    canvas,
    world,
    world_extraction,
)
# RAG 路由模块（已拆分为 3 个独立模块 + 1 个模型文件）
from .routers import rag_index, rag_search, rag_maintenance
# 项目路由模块（已拆分为 3 个独立模块 + 1 个模型文件）
from .routers import project_crud, project_generation

# 配置日志
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("🚀 Novel Backend Service 启动")
    logger.info(f"📊 数据库: {settings.DATABASE_URL.split('@')[-1]}")
    logger.info(f"🤖 AI 模型: {settings.OPENAI_MODEL}")

    # 初始化向量服务
    from .services.vector_service import get_vector_service
    vector_service = get_vector_service()
    if vector_service.enabled:
        stats = vector_service.get_stats()
        logger.info(
            f"🔍 RAG 向量服务已启用 - "
            f"Collection: {stats.get('collection_name')}, "
            f"文档数: {stats.get('total_documents')}, "
            f"Embedding: {stats.get('embedding_model')}"
        )
    else:
        logger.warning("⚠️ RAG 向量服务未启用，将使用关键词匹配降级模式")

    yield
    logger.info("👋 Novel Backend Service 关闭")


# 创建 FastAPI 应用
# 注意: 移除了 root_path="/api/novel" 配置
# 原因: FastAPI 在使用 root_path 时会将其添加到所有路由和 OpenAPI 文档路径前,
#      导致实际路径变成 /api/novel/api/novel/*, 造成 404 错误。
#      本服务设计为通过 Next.js 代理访问 (/api/novel/* -> http://localhost:8000/*),
#      因此 FastAPI 应用本身不需要感知 /api/novel 前缀。
app = FastAPI(
    title="Novel Backend Service",
    description="""
AI 小说创作后端服务 - 提供小说生成、RAG 检索、世界观管理等功能

**重要**: 本服务必须通过 Next.js 代理访问，不应直接暴露给外部用户。
- 生产环境: Next.js 代理 `/api/novel/*` 到本服务
- 开发环境: 可直接访问用于测试 (http://localhost:8000)

**代理路径映射**:
- 客户端请求: `POST /api/novel/projects` (Next.js)
- 后端实际路径: `POST /projects` (FastAPI)
""",
    version="1.0.0",
    lifespan=lifespan,
    servers=[
        {
            "url": "http://localhost:3000/api/novel",
            "description": "开发环境 - 通过 Next.js 代理访问 (推荐)"
        },
        {
            "url": "http://localhost:8000",
            "description": "开发环境 - 直接访问后端服务 (仅用于测试)"
        },
        {
            "url": "https://your-domain.com/api/novel",
            "description": "生产环境 - 通过 Next.js 代理访问 (必须)"
        }
    ],
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
# 项目管理路由（已拆分为 2 个模块，按功能组织）
app.include_router(project_crud.router)  # 项目 CRUD + 统计导出
app.include_router(project_generation.router)  # AI 生成（角色、世界观、大纲）

app.include_router(chapters.router)
app.include_router(inspiration.router)
app.include_router(search.router)
app.include_router(export.router)
app.include_router(batch.router)
app.include_router(versions.router)  # 版本管理路由
app.include_router(progressive.router)  # 渐进式大纲生成与智能分析

# RAG 索引管理路由（已拆分为 3 个模块，按功能组织）
app.include_router(rag_index.router)  # 索引管理（创建、删除、重建）
app.include_router(rag_search.router)  # 查询检索（统计、详情、列表）
app.include_router(rag_maintenance.router)  # 维护与一致性（检查、导出、清理）

app.include_router(canvas.router)  # 无限画布生成服务
app.include_router(world.router)  # 世界观记忆库与伏笔管理
app.include_router(world_extraction.router)  # 世界观 AI 提取


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "novel-backend",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Novel Backend Service",
        "docs": "/docs",
        "health": "/health"
    }
