"""启动时访问外部系统的钩子。

测试可以整对象替换，从而不连接 Postgres、向量库或对象存储。
日志仍使用 app.main，避免 logger 名相对原 lifespan 发生变化。
"""
from __future__ import annotations

import logging
import time

from sqlalchemy import text

logger = logging.getLogger("app.main")


class StartupHooks:
    """生产环境使用的启动钩子。失败只记日志，不阻止进程起来。"""

    async def postgres(self) -> None:
        from .database import AsyncSessionLocal

        try:
            start_time = time.time()
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            warmup_time = (time.time() - start_time) * 1000
            logger.info(f"🔌 数据库连接池预热完成 ({warmup_time:.0f}ms)")
        except Exception as e:
            logger.warning(f"⚠️ 数据库连接池预热失败: {e}")

    def vector_store(self) -> None:
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

    def object_storage(self) -> None:
        # 当前启动流程不连接对象存储。保留钩子，避免以后把 MinIO 连接写死在 lifespan 里。
        return None


startup_hooks = StartupHooks()
