"""
FastAPI 主应用
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import settings
from .startup import startup_hooks
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
    templates,
    workflow,
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

    # 外部依赖集中在可替换钩子，进程内测试不必连接真实服务
    await startup_hooks.postgres()
    startup_hooks.vector_store()
    startup_hooks.object_storage()

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

## 认证方式

本服务使用 JWT Bearer Token 认证。获取 token 的流程：

1. 用户在 Next.js 前端登录 (`POST /api/auth/login`)
2. Next.js 返回 HTTP-only cookie (`comicai_session`)
3. 调用本服务时，Next.js 代理层自动将 cookie 转换为 Bearer token
4. 直接测试时，可通过 Next.js 的 `/api/auth/token` 端点获取 token

**在 Swagger UI 中测试**:
1. 点击右上角 "Authorize" 按钮
2. 输入从 Next.js 获取的 JWT token
3. 格式: `Bearer <your_jwt_token>`
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
    # OpenAPI 安全方案配置
    swagger_ui_parameters={
        "persistAuthorization": True,  # 保持认证状态
        "displayRequestDuration": True,  # 显示请求耗时
    },
)

# 配置 JWT 认证 Security Scheme（用于 Swagger UI）
# 注意：这只是文档层面的配置，实际认证逻辑在 middleware/auth.py 中实现
from fastapi.openapi.utils import get_openapi


def custom_openapi():
    """自定义 OpenAPI schema，添加 JWT 认证配置"""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        servers=app.servers,
    )

    # 添加 JWT Bearer 认证方案
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": """
JWT 认证 token。

**获取方式**：
1. 通过 Next.js 前端登录获取 token
2. 或访问 Next.js 的 `/api/auth/token` 端点获取当前用户的 token

**使用方式**：
- 在 Swagger UI 中点击 "Authorize" 按钮
- 输入 token（无需添加 "Bearer " 前缀，系统会自动添加）
- 点击 "Authorize" 完成认证
"""
        }
    }

    # 为所有需要认证的端点添加 security 要求
    # 注意：health 和 root 端点不需要认证
    for path, path_item in openapi_schema["paths"].items():
        if path in ["/health", "/"]:
            continue
        for method in path_item:
            if method in ["get", "post", "put", "delete", "patch"]:
                if "security" not in path_item[method]:
                    path_item[method]["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

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

# 专业创作工作流系统
app.include_router(templates.router)  # 写作提示词模板管理
app.include_router(workflow.router)  # 专业创作工作流


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
