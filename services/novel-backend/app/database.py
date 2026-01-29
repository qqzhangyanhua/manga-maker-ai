"""
数据库连接和会话管理

优化说明:
- pool_size=5: 预先建立 5 个连接，避免首次查询时的连接建立延迟
- max_overflow=10: 允许额外 10 个连接处理高峰
- pool_recycle=3600: 每小时回收连接，防止连接老化
- pool_pre_ping=True: 检查连接有效性
- pool_timeout=30: 等待连接的超时时间
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from .config import settings

# 创建异步引擎
# 注意：远程数据库网络延迟约 350-400ms/查询，这是网络 RTT 导致的
engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=False,
    pool_pre_ping=True,
    pool_size=5,           # 保持 5 个预热连接
    max_overflow=10,       # 高峰时最多 15 个连接
    pool_recycle=3600,     # 1 小时回收
    pool_timeout=30,       # 等待连接超时
)

# 创建会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# 声明基类
Base = declarative_base()


async def get_db() -> AsyncSession:
    """获取数据库会话（依赖注入）"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
