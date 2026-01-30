"""
应用配置

环境变量配置说明:
- 必填项: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, MINIO_*
- 可选项: 其他配置项都有默认值

示例 .env 文件:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/manga
JWT_SECRET=your-secret-key-at-least-32-characters-long
OPENAI_API_KEY=sk-...
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=manga-maker
```
"""
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List
import re


class Settings(BaseSettings):
    """
    应用配置类

    所有配置项都通过环境变量加载，支持 .env 文件
    关键配置项包含验证逻辑，确保配置正确性
    """

    # 数据库配置
    DATABASE_URL: str = Field(
        ...,
        description="PostgreSQL 数据库连接字符串",
        examples=["postgresql://user:pass@localhost:5432/manga"]
    )

    # JWT 配置
    JWT_SECRET: str = Field(
        ...,
        min_length=32,
        description="JWT 签名密钥，必须至少 32 个字符以确保安全性"
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT 签名算法，推荐使用 HS256"
    )

    # OpenAI 配置
    OPENAI_API_KEY: str = Field(
        ...,
        min_length=20,
        description="OpenAI API 密钥"
    )
    OPENAI_API_BASE: str = Field(
        default="https://api.openai.com/v1",
        description="OpenAI API 基础 URL"
    )
    OPENAI_MODEL: str = Field(
        default="gpt-4-turbo-preview",
        description="OpenAI 模型名称"
    )

    # Embedding 模型配置
    OPENAI_EMBEDDING_MODEL: str = Field(
        default="text-embedding-3-small",
        description="Embedding 模型: text-embedding-3-small (推荐), text-embedding-ada-002 (旧版), text-embedding-3-large (最强)"
    )
    OPENAI_EMBEDDING_API_BASE: str = Field(
        default="",
        description="Embedding API Base URL (可选，不设置则使用 OPENAI_API_BASE)"
    )

    # MinIO 配置
    MINIO_ENDPOINT: str = Field(
        ...,
        description="MinIO 服务端点，格式: host:port"
    )
    MINIO_ACCESS_KEY: str = Field(
        ...,
        min_length=3,
        description="MinIO 访问密钥"
    )
    MINIO_SECRET_KEY: str = Field(
        ...,
        min_length=8,
        description="MinIO 密钥"
    )
    MINIO_BUCKET_NAME: str = Field(
        ...,
        description="MinIO 存储桶名称"
    )
    MINIO_USE_SSL: bool = Field(
        default=False,
        description="是否使用 SSL 连接 MinIO"
    )

    # CORS 配置
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="允许的 CORS 源，多个源用逗号分隔"
    )

    # 日志配置
    LOG_LEVEL: str = Field(
        default="INFO",
        description="日志级别: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )

    # 向量数据库配置
    CHROMA_PERSIST_DIR: str = Field(
        default="./chroma_db",
        description="ChromaDB 持久化目录"
    )
    CHROMA_COLLECTION_NAME: str = Field(
        default="novel_chapters",
        description="ChromaDB 集合名称"
    )
    RAG_TOP_K: int = Field(
        default=3,
        ge=1,
        le=20,
        description="RAG 检索返回的最大结果数"
    )
    RAG_ENABLE_VECTOR_SEARCH: bool = Field(
        default=True,
        description="是否启用向量搜索"
    )

    # 环境配置（用于区分开发/生产环境）
    ENVIRONMENT: str = Field(
        default="development",
        description="运行环境: development, staging, production"
    )

    # ========== 字段验证器 ==========

    @field_validator('DATABASE_URL')
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """验证数据库连接字符串格式"""
        if not v.startswith(('postgresql://', 'postgres://')):
            raise ValueError(
                'DATABASE_URL 必须是有效的 PostgreSQL 连接字符串 '
                '(以 postgresql:// 或 postgres:// 开头)'
            )
        # 检查是否包含必要的组件
        if '@' not in v or '/' not in v.split('@')[-1]:
            raise ValueError(
                'DATABASE_URL 格式错误，应为: '
                'postgresql://user:password@host:port/database'
            )
        return v

    @field_validator('JWT_SECRET')
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """验证 JWT 密钥强度"""
        if len(v) < 32:
            raise ValueError(
                'JWT_SECRET 必须至少 32 个字符以确保安全性 '
                f'(当前长度: {len(v)})'
            )
        # 建议包含多种字符类型
        if v.isalnum() and len(set(v)) < 10:
            raise ValueError(
                'JWT_SECRET 过于简单，建议使用包含字母、数字和特殊字符的复杂密钥'
            )
        return v

    @field_validator('OPENAI_API_KEY')
    @classmethod
    def validate_openai_api_key(cls, v: str) -> str:
        """验证 OpenAI API Key 格式"""
        if not v.startswith('sk-'):
            raise ValueError(
                'OPENAI_API_KEY 格式错误，应以 sk- 开头'
            )
        if len(v) < 20:
            raise ValueError(
                'OPENAI_API_KEY 长度不足，请检查是否完整'
            )
        return v

    @field_validator('MINIO_ENDPOINT')
    @classmethod
    def validate_minio_endpoint(cls, v: str) -> str:
        """验证 MinIO 端点格式"""
        # 移除可能的协议前缀
        v = v.replace('http://', '').replace('https://', '')

        # 验证格式: host:port 或 host
        if ':' in v:
            host, port = v.rsplit(':', 1)
            if not port.isdigit():
                raise ValueError(
                    f'MINIO_ENDPOINT 端口号无效: {port}'
                )
        return v

    @field_validator('LOG_LEVEL')
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """验证日志级别"""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(
                f'LOG_LEVEL 必须是以下之一: {", ".join(valid_levels)}'
            )
        return v_upper

    @field_validator('ENVIRONMENT')
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """验证环境配置"""
        valid_envs = ['development', 'staging', 'production']
        v_lower = v.lower()
        if v_lower not in valid_envs:
            raise ValueError(
                f'ENVIRONMENT 必须是以下之一: {", ".join(valid_envs)}'
            )
        return v_lower

    @field_validator('CORS_ORIGINS')
    @classmethod
    def validate_cors_origins(cls, v: str) -> str:
        """验证 CORS 源配置"""
        origins = [origin.strip() for origin in v.split(',')]
        for origin in origins:
            if not origin.startswith(('http://', 'https://')):
                raise ValueError(
                    f'CORS_ORIGINS 中的源必须包含协议 (http:// 或 https://): {origin}'
                )
        return v

    # LLM 通用配置（向后兼容，作为 OPENAI_* 的别名）
    # 这些字段由 Canvas 模块使用，未来可扩展支持其他 LLM 提供商
    @property
    def LLM_API_KEY(self) -> str:
        """LLM API Key (使用 OpenAI API Key)"""
        return self.OPENAI_API_KEY

    @property
    def LLM_BASE_URL(self) -> str:
        """LLM API Base URL (使用 OpenAI API Base)"""
        return self.OPENAI_API_BASE

    @property
    def LLM_MODEL(self) -> str:
        """LLM Model (使用 OpenAI Model)"""
        return self.OPENAI_MODEL
    
    @property
    def cors_origins_list(self) -> List[str]:
        """将 CORS_ORIGINS 字符串转换为列表"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
