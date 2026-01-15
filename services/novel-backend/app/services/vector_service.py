"""
向量化服务 - 基于 ChromaDB 和 OpenAI Embeddings
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime
import chromadb
from chromadb.config import Settings as ChromaSettings
from openai import AsyncOpenAI

from ..config import settings

logger = logging.getLogger(__name__)


class VectorService:
    """向量化服务 - 管理章节的 Embedding 和向量检索"""

    def __init__(self):
        """初始化向量服务"""
        self.enabled = settings.RAG_ENABLE_VECTOR_SEARCH
        self.client: Optional[chromadb.ClientAPI] = None
        self.collection: Optional[chromadb.Collection] = None
        self.openai_client: Optional[AsyncOpenAI] = None

        if self.enabled:
            try:
                # 初始化 ChromaDB (SQLite 模式)
                self.client = chromadb.Client(
                    ChromaSettings(
                        persist_directory=settings.CHROMA_PERSIST_DIR,
                        anonymized_telemetry=False,
                    )
                )

                # 获取或创建 Collection
                self.collection = self.client.get_or_create_collection(
                    name=settings.CHROMA_COLLECTION_NAME,
                    metadata={"description": "Novel chapters vector store"},
                )

                # 初始化 OpenAI 客户端
                # 优先使用 OPENAI_EMBEDDING_API_BASE，如果未设置则使用 OPENAI_API_BASE
                embedding_base_url = settings.OPENAI_EMBEDDING_API_BASE or settings.OPENAI_API_BASE
                self.openai_client = AsyncOpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    base_url=embedding_base_url,
                )

                logger.info(
                    f"✅ 向量服务初始化成功 - Collection: {settings.CHROMA_COLLECTION_NAME}, "
                    f"文档数: {self.collection.count()}, "
                    f"API Base: {embedding_base_url}"
                )
            except Exception as e:
                logger.error(f"❌ 向量服务初始化失败: {str(e)}")
                self.enabled = False
                self.client = None
                self.collection = None

    async def get_embedding(self, text: str) -> List[float]:
        """
        生成文本的 Embedding

        Args:
            text: 待向量化的文本

        Returns:
            1536 维向量
        """
        if not self.openai_client:
            raise RuntimeError("OpenAI 客户端未初始化")

        try:
            response = await self.openai_client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL, input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"生成 Embedding 失败: {str(e)}")
            raise

    async def index_chapter(
        self,
        chapter_id: str,
        project_id: str,
        chapter_number: int,
        title: str,
        outline: str,
        content: Optional[str] = None,
    ) -> bool:
        """
        索引章节到向量数据库

        Args:
            chapter_id: 章节 ID
            project_id: 项目 ID
            chapter_number: 章节号
            title: 章节标题
            outline: 章节大纲
            content: 章节内容（可选）

        Returns:
            是否成功
        """
        if not self.enabled or not self.collection:
            logger.warning("向量服务未启用，跳过索引")
            return False

        try:
            # 构建索引文本：标题 + 大纲 + 内容摘要
            index_text = f"{title}\n\n{outline}"
            if content:
                # 只取前 1000 字内容作为摘要
                index_text += f"\n\n{content[:1000]}"

            # 生成 Embedding
            embedding = await self.get_embedding(index_text)

            # 存储到 Chroma
            self.collection.upsert(
                ids=[chapter_id],
                embeddings=[embedding],
                metadatas=[
                    {
                        "project_id": project_id,
                        "chapter_number": chapter_number,
                        "title": title,
                        "outline": outline[:500],  # 限制元数据大小
                        "content_preview": (content or "")[:200],
                        "indexed_at": datetime.utcnow().isoformat() + "Z",
                    }
                ],
                documents=[index_text],
            )

            logger.info(
                f"✅ 章节索引成功 - ID: {chapter_id}, "
                f"标题: {title}, "
                f"文本长度: {len(index_text)}"
            )
            return True

        except Exception as e:
            logger.error(f"❌ 章节索引失败 - ID: {chapter_id}, 错误: {str(e)}")
            return False

    async def search_similar_chapters(
        self, query_text: str, project_id: str, exclude_chapter_id: Optional[str] = None, k: int = 3
    ) -> List[Dict]:
        """
        向量检索相似章节

        Args:
            query_text: 查询文本（当前章节大纲）
            project_id: 项目 ID（过滤条件）
            exclude_chapter_id: 排除的章节 ID
            k: 返回数量

        Returns:
            相似章节列表 [
                {
                    "chapter_id": "uuid",
                    "chapter_number": 1,
                    "title": "标题",
                    "outline": "大纲",
                    "content_preview": "内容摘要",
                    "similarity": 0.95
                }
            ]
        """
        if not self.enabled or not self.collection:
            logger.warning("向量服务未启用，返回空结果")
            return []

        try:
            # 生成查询向量
            query_embedding = await self.get_embedding(query_text)

            # 构建过滤条件
            where_filter = {"project_id": project_id}

            # 执行向量检索
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k + 1,  # 多取 1 个，用于排除自己
                where=where_filter,
                include=["metadatas", "distances"],
            )

            if not results["ids"] or not results["ids"][0]:
                return []

            # 解析结果
            similar_chapters = []
            for i, chapter_id in enumerate(results["ids"][0]):
                # 排除自己
                if exclude_chapter_id and chapter_id == exclude_chapter_id:
                    continue

                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 1.0

                # 转换距离为相似度（余弦距离 → 相似度）
                similarity = 1 - distance

                similar_chapters.append(
                    {
                        "chapter_id": chapter_id,
                        "chapter_number": metadata.get("chapter_number", 0),
                        "title": metadata.get("title", ""),
                        "outline": metadata.get("outline", ""),
                        "content_preview": metadata.get("content_preview", ""),
                        "similarity": round(similarity, 3),
                    }
                )

                # 只返回 k 个结果
                if len(similar_chapters) >= k:
                    break

            logger.info(
                f"🔍 向量检索完成 - 查询长度: {len(query_text)}, "
                f"结果数: {len(similar_chapters)}, "
                f"平均相似度: {sum(c['similarity'] for c in similar_chapters) / len(similar_chapters) if similar_chapters else 0:.3f}"
            )

            return similar_chapters

        except Exception as e:
            logger.error(f"❌ 向量检索失败: {str(e)}")
            return []

    async def delete_chapter(self, chapter_id: str) -> bool:
        """
        删除章节索引

        Args:
            chapter_id: 章节 ID

        Returns:
            是否成功
        """
        if not self.enabled or not self.collection:
            return False

        try:
            self.collection.delete(ids=[chapter_id])
            logger.info(f"🗑️ 章节索引已删除 - ID: {chapter_id}")
            return True
        except Exception as e:
            logger.error(f"❌ 删除章节索引失败 - ID: {chapter_id}, 错误: {str(e)}")
            return False

    async def batch_index_chapters(self, chapters: List[Dict]) -> int:
        """
        批量索引章节

        Args:
            chapters: 章节列表 [
                {
                    "id": "uuid",
                    "project_id": "uuid",
                    "chapter_number": 1,
                    "title": "标题",
                    "outline": "大纲",
                    "content": "内容"
                }
            ]

        Returns:
            成功索引的数量
        """
        if not self.enabled:
            logger.warning("向量服务未启用，跳过批量索引")
            return 0

        success_count = 0
        for chapter in chapters:
            success = await self.index_chapter(
                chapter_id=chapter["id"],
                project_id=chapter["project_id"],
                chapter_number=chapter["chapter_number"],
                title=chapter["title"],
                outline=chapter["outline"],
                content=chapter.get("content"),
            )
            if success:
                success_count += 1

        logger.info(
            f"📦 批量索引完成 - 总数: {len(chapters)}, "
            f"成功: {success_count}, "
            f"失败: {len(chapters) - success_count}"
        )

        return success_count

    def get_stats(self) -> Dict:
        """获取向量库统计信息"""
        if not self.enabled or not self.collection:
            return {"enabled": False}

        return {
            "enabled": True,
            "collection_name": settings.CHROMA_COLLECTION_NAME,
            "total_documents": self.collection.count(),
            "embedding_model": settings.OPENAI_EMBEDDING_MODEL,
        }


# 单例模式
_vector_service_instance: Optional[VectorService] = None


def get_vector_service() -> VectorService:
    """获取向量服务单例"""
    global _vector_service_instance
    if _vector_service_instance is None:
        _vector_service_instance = VectorService()
    return _vector_service_instance
