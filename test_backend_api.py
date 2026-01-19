#!/usr/bin/env python3
"""
测试后端 API 是否返回 chapters 字段
"""
import asyncio
from uuid import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

# 导入模型
import sys
sys.path.insert(0, '/Users/zhangyanhua/AI/manga-maker-ai/services/novel-backend')

from app.models import NovelProject, NovelChapter
from app.config import settings

async def test_get_project():
    # 创建数据库连接
    engine = create_async_engine(
        settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'),
        echo=True,
    )

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    project_id = UUID('19332382-ee75-4e08-9ec0-a7834063432c')

    async with async_session() as db:
        # 查询项目
        query = select(NovelProject).where(NovelProject.id == project_id)
        result = await db.execute(query)
        project = result.scalar_one_or_none()

        if not project:
            print(f"❌ 项目不存在: {project_id}")
            return

        print(f"✅ 找到项目: {project.title}")

        # 查询统计信息
        stats_query = select(
            func.count(NovelChapter.id).label("chapter_count"),
            func.coalesce(func.sum(NovelChapter.word_count), 0).label("total_words")
        ).where(NovelChapter.project_id == project_id)

        stats_result = await db.execute(stats_query)
        stats = stats_result.one()

        print(f"📊 章节统计: {stats.chapter_count} 章, {stats.total_words} 字")

        # 查询完整章节列表
        chapters_query = select(NovelChapter).where(
            NovelChapter.project_id == project_id
        ).order_by(NovelChapter.chapter_number)

        chapters_result = await db.execute(chapters_query)
        chapters = chapters_result.scalars().all()

        print(f"\n📚 章节列表 ({len(chapters)} 个):")
        for ch in chapters[:5]:  # 只显示前5个
            has_content = ch.content and len(ch.content) > 0
            has_outline = ch.outline and len(ch.outline) > 0
            print(f"  - 第 {ch.chapter_number} 章: {ch.title}")
            print(f"    状态: {ch.status}, 字数: {ch.word_count}")
            print(f"    有正文: {has_content} (长度: {len(ch.content) if ch.content else 0})")
            print(f"    有大纲: {has_outline} (长度: {len(ch.outline) if ch.outline else 0})")

        if len(chapters) > 5:
            print(f"  ... 还有 {len(chapters) - 5} 个章节")

        # 转换为响应格式
        chapters_data = [
            {
                "id": str(ch.id),
                "chapter_number": ch.chapter_number,
                "title": ch.title,
                "outline": ch.outline,
                "content": ch.content,
                "word_count": ch.word_count,
                "status": ch.status,
                "is_key_chapter": ch.is_key_chapter,
            }
            for ch in chapters
        ]

        print(f"\n✅ 转换后的 chapters_data 长度: {len(chapters_data)}")
        if chapters_data:
            print(f"第一个章节: {chapters_data[0]['title']}, 有内容: {bool(chapters_data[0]['content'])}")

if __name__ == "__main__":
    asyncio.run(test_get_project())
