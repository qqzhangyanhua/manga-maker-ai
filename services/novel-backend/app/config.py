"""
应用配置
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用配置类"""
    
    # 数据库配置
    DATABASE_URL: str
    
    # JWT 配置
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    
    # OpenAI 配置
    OPENAI_API_KEY: str
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4-turbo-preview"

    # Embedding 模型配置
    # 可选: text-embedding-3-small (推荐, 更便宜), text-embedding-ada-002 (旧版), text-embedding-3-large (最强)
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    # Embedding API Base URL (可选，不设置则使用 OPENAI_API_BASE)
    OPENAI_EMBEDDING_API_BASE: str = ""
    
    # MinIO 配置
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_NAME: str
    MINIO_USE_SSL: bool = False
    
    # CORS 配置
    CORS_ORIGINS: str = "http://localhost:3000"
    
    # 日志配置
    LOG_LEVEL: str = "INFO"

    # 向量数据库配置
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION_NAME: str = "novel_chapters"
    RAG_TOP_K: int = 3
    RAG_ENABLE_VECTOR_SEARCH: bool = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        """将 CORS_ORIGINS 字符串转换为列表"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
