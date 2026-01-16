"""
FastAPI 主应用
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import settings
from .routers import projects, chapters, inspiration, search, export, batch, versions, progressive, rag, canvas

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
app = FastAPI(
    title="Novel Backend Service",
    description="AI 小说创作后端服务",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/api/novel",  # 统一路由前缀（通过 Next.js 代理）
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
app.include_router(projects.router)
app.include_router(chapters.router)
app.include_router(inspiration.router)
app.include_router(search.router)
app.include_router(export.router)
app.include_router(batch.router)
app.include_router(versions.router)  # 版本管理路由
app.include_router(progressive.router)  # 渐进式大纲生成与智能分析
app.include_router(rag.router)  # RAG 索引管理路由
app.include_router(canvas.router)  # 无限画布生成服务


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
