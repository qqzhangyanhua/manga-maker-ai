#!/usr/bin/env python3
"""
RAG 系统集成测试脚本
测试向量服务、索引、检索等核心功能
"""
import sys
import os
import asyncio
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

async def test_vector_service():
    """测试向量服务初始化"""
    print("\n" + "="*60)
    print("测试 1: 向量服务初始化")
    print("="*60)

    try:
        from app.services.vector_service import get_vector_service

        vs = get_vector_service()
        print(f"✅ 向量服务初始化成功")
        print(f"   - 启用状态: {vs.enabled}")

        if vs.enabled:
            stats = vs.get_stats()
            print(f"   - Collection: {stats.get('collection_name')}")
            print(f"   - 文档总数: {stats.get('total_documents')}")
            print(f"   - Embedding模型: {stats.get('embedding_model')}")
            return True
        else:
            print(f"⚠️  向量服务未启用（将使用关键词匹配降级模式）")
            return False

    except Exception as e:
        print(f"❌ 向量服务初始化失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_embedding_generation():
    """测试 Embedding 生成"""
    print("\n" + "="*60)
    print("测试 2: Embedding 生成")
    print("="*60)

    try:
        from app.services.vector_service import get_vector_service

        vs = get_vector_service()
        if not vs.enabled:
            print("⏭️  跳过测试（向量服务未启用）")
            return False

        test_text = "这是一个测试章节，讲述主角李明在神秘森林中的冒险故事。"
        print(f"测试文本: {test_text}")

        embedding = await vs.get_embedding(test_text)
        print(f"✅ Embedding 生成成功")
        print(f"   - 维度: {len(embedding)}")
        print(f"   - 前5维: {embedding[:5]}")

        return True

    except Exception as e:
        print(f"❌ Embedding 生成失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_chapter_indexing():
    """测试章节索引"""
    print("\n" + "="*60)
    print("测试 3: 章节索引")
    print("="*60)

    try:
        from app.services.vector_service import get_vector_service

        vs = get_vector_service()
        if not vs.enabled:
            print("⏭️  跳过测试（向量服务未启用）")
            return False

        # 创建测试章节
        test_chapters = [
            {
                "chapter_id": "test-chapter-1",
                "project_id": "test-project-1",
                "chapter_number": 1,
                "title": "第一章：神秘的开始",
                "outline": "主角李明在一个雨夜发现了一本古老的魔法书",
                "content": "雨夜，李明在图书馆的角落里发现了一本泛着幽光的古书..."
            },
            {
                "chapter_id": "test-chapter-2",
                "project_id": "test-project-1",
                "chapter_number": 2,
                "title": "第二章：魔法的觉醒",
                "outline": "李明开始学习魔法，并遇到了神秘导师",
                "content": "当李明翻开古书的第一页，一股奇异的力量涌入他的体内..."
            },
            {
                "chapter_id": "test-chapter-3",
                "project_id": "test-project-1",
                "chapter_number": 3,
                "title": "第三章：黑暗势力的阴谋",
                "outline": "邪恶组织盯上了李明手中的魔法书",
                "content": "暗影教派的首领得知魔法书重现人间的消息后，立即派出杀手..."
            }
        ]

        print(f"准备索引 {len(test_chapters)} 个测试章节...")

        success_count = 0
        for chapter in test_chapters:
            success = await vs.index_chapter(
                chapter_id=chapter["chapter_id"],
                project_id=chapter["project_id"],
                chapter_number=chapter["chapter_number"],
                title=chapter["title"],
                outline=chapter["outline"],
                content=chapter["content"]
            )
            if success:
                success_count += 1
                print(f"   ✅ 索引成功: {chapter['title']}")
            else:
                print(f"   ❌ 索引失败: {chapter['title']}")

        print(f"\n索引完成: {success_count}/{len(test_chapters)} 成功")

        # 验证索引数量
        stats = vs.get_stats()
        print(f"当前文档总数: {stats.get('total_documents')}")

        return success_count == len(test_chapters)

    except Exception as e:
        print(f"❌ 章节索引失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_vector_search():
    """测试向量检索"""
    print("\n" + "="*60)
    print("测试 4: 向量检索")
    print("="*60)

    try:
        from app.services.vector_service import get_vector_service

        vs = get_vector_service()
        if not vs.enabled:
            print("⏭️  跳过测试（向量服务未启用）")
            return False

        # 测试查询
        test_queries = [
            "魔法与力量",
            "邪恶势力的威胁",
            "主角的冒险旅程"
        ]

        for query in test_queries:
            print(f"\n查询: '{query}'")
            results = await vs.search_similar_chapters(
                query_text=query,
                project_id="test-project-1",
                k=3
            )

            if results:
                print(f"找到 {len(results)} 个相似章节:")
                for i, result in enumerate(results, 1):
                    print(f"   {i}. {result['title']} (相似度: {result['similarity']:.3f})")
                    print(f"      大纲: {result['outline'][:50]}...")
            else:
                print(f"   未找到相似章节")

        return True

    except Exception as e:
        print(f"❌ 向量检索失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_rag_service():
    """测试 RAG 服务"""
    print("\n" + "="*60)
    print("测试 5: RAG 服务集成")
    print("="*60)

    try:
        # 由于需要数据库连接，这里只做简单的导入测试
        from app.services.rag_service import NovelRAGService
        print("✅ RAG 服务导入成功")
        print("   (完整测试需要数据库连接)")

        return True

    except Exception as e:
        print(f"❌ RAG 服务导入失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def cleanup_test_data():
    """清理测试数据"""
    print("\n" + "="*60)
    print("清理测试数据")
    print("="*60)

    try:
        from app.services.vector_service import get_vector_service

        vs = get_vector_service()
        if not vs.enabled:
            print("⏭️  跳过清理（向量服务未启用）")
            return True

        test_chapter_ids = [
            "test-chapter-1",
            "test-chapter-2",
            "test-chapter-3"
        ]

        for chapter_id in test_chapter_ids:
            await vs.delete_chapter(chapter_id)

        print(f"✅ 清理完成: 删除 {len(test_chapter_ids)} 个测试章节")

        # 验证清理结果
        stats = vs.get_stats()
        print(f"当前文档总数: {stats.get('total_documents')}")

        return True

    except Exception as e:
        print(f"❌ 清理失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """主测试流程"""
    print("\n" + "🔍" * 30)
    print("RAG 系统集成测试")
    print("🔍" * 30)

    results = {}

    # 测试 1: 向量服务初始化
    results['init'] = await test_vector_service()

    # 测试 2: Embedding 生成
    results['embedding'] = await test_embedding_generation()

    # 测试 3: 章节索引
    results['indexing'] = await test_chapter_indexing()

    # 测试 4: 向量检索
    results['search'] = await test_vector_search()

    # 测试 5: RAG 服务
    results['rag_service'] = await test_rag_service()

    # 清理测试数据
    await cleanup_test_data()

    # 测试总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, passed_flag in results.items():
        status = "✅ PASS" if passed_flag else "❌ FAIL"
        print(f"{status} - {test_name}")

    print(f"\n通过率: {passed}/{total} ({passed/total*100:.1f}%)")

    if passed == total:
        print("\n🎉 所有测试通过！RAG 系统工作正常。")
        return 0
    else:
        print("\n⚠️  部分测试失败，请检查错误日志。")
        return 1


def test_get_chapters_list():
    """测试获取章节索引列表"""
    from fastapi.testclient import TestClient
    from app.main import app
    from jose import jwt
    from datetime import datetime, timedelta, timezone
    import os

    client = TestClient(app)

    # 生成有效的 JWT token（使用实际的 JWT_SECRET）
    jwt_secret = os.getenv("JWT_SECRET", "zhangyanhua12345")
    payload = {
        "userId": "test-user-id-123",
        "email": "test@example.com",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, jwt_secret, algorithm="HS256")

    response = client.get(
        "/api/novel/rag/chapters?page=1&limit=20",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    assert "page" in data
    assert "limit" in data
    print(f"✅ Test passed! Total chapters: {data['total']}, Items: {len(data['items'])}")



if __name__ == "__main__":
    # 设置环境变量（如果没有 .env 文件）
    if not os.path.exists(".env"):
        print("⚠️  未找到 .env 文件，使用测试配置")
        os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
        os.environ.setdefault("JWT_SECRET", "test-secret")
        os.environ.setdefault("OPENAI_API_KEY", "your-openai-key")
        os.environ.setdefault("OPENAI_API_BASE", "https://api.openai.com/v1")
        os.environ.setdefault("OPENAI_MODEL", "gpt-4-turbo-preview")
        os.environ.setdefault("OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002")
        os.environ.setdefault("MINIO_ENDPOINT", "localhost")
        os.environ.setdefault("MINIO_ACCESS_KEY", "minioadmin")
        os.environ.setdefault("MINIO_SECRET_KEY", "minioadmin")
        os.environ.setdefault("MINIO_BUCKET_NAME", "test")
        os.environ.setdefault("CHROMA_PERSIST_DIR", "./test_chroma_db")
        os.environ.setdefault("CHROMA_COLLECTION_NAME", "test_chapters")
        os.environ.setdefault("RAG_ENABLE_VECTOR_SEARCH", "true")

    exit_code = asyncio.run(main())
    sys.exit(exit_code)
