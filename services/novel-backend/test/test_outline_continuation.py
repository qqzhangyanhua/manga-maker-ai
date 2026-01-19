"""
续写大纲功能测试脚本
测试 RAG 增强的大纲续写功能是否正常工作
"""
import asyncio
import json
from app.services.generation_service import NovelGenerationService

async def test_outline_continuation():
    """测试续写模式的大纲生成"""

    print("=" * 80)
    print("📋 续写大纲功能测试")
    print("=" * 80)

    # 模拟现有章节大纲
    existing_outlines = [
        {
            "chapter_number": 1,
            "title": "穿越异界",
            "outline": "现代程序员林枫因车祸穿越到修仙世界，发现自己成为一个废柴弟子。意外获得系统，可以用代码编写法术。",
            "key_events": ["车祸穿越", "发现系统", "测试第一个法术"],
            "characters": ["林枫"],
            "plot_lines": ["系统获得"],
            "is_key_chapter": True
        },
        {
            "chapter_number": 2,
            "title": "初露锋芒",
            "outline": "林枫在宗门考核中利用系统编写的法术击败欺负他的师兄，引起长老注意。获得进入藏经阁的机会。",
            "key_events": ["宗门考核", "击败王师兄", "获得奖励"],
            "characters": ["林枫", "王师兄", "李长老"],
            "plot_lines": ["系统应用", "宗门考核"],
            "is_key_chapter": False
        },
        {
            "chapter_number": 3,
            "title": "藏经阁奇遇",
            "outline": "林枫在藏经阁发现一本残破古籍，记载着失传的阵法。利用系统分析阵法原理，意外领悟强大技能。",
            "key_events": ["发现古籍", "系统分析", "领悟技能"],
            "characters": ["林枫", "藏经阁守阁老者"],
            "plot_lines": ["系统升级", "阵法线索"],
            "is_key_chapter": True
        }
    ]

    # 模拟 RAG 检索结果（语义相关章节）
    rag_context = [
        {
            "chapter_number": 1,
            "title": "穿越异界",
            "outline": "现代程序员林枫因车祸穿越到修仙世界...",
            "content_preview": "林枫睁开眼睛，发现自己躺在一个简陋的房间里。脑海中涌入陌生的记忆...",
            "summary_preview": "主角穿越获得系统，位于青云宗外门弟子住所"
        },
        {
            "chapter_number": 2,
            "title": "初露锋芒",
            "outline": "林枫在宗门考核中利用系统...",
            "content_preview": "演武场上，林枫面对王师兄的嘲讽，冷静地调出系统界面...",
            "summary_preview": "主角通过考核，获得长老青睐，藏经阁令牌在手"
        }
    ]

    # 测试参数
    premise = "现代程序员穿越修仙世界，用编程思维改造修仙体系，最终成为一代宗师的故事"

    characters = [
        {
            "name": "林枫",
            "role": "主角，穿越者",
            "description": "原现代程序员，穿越后获得系统，擅长用编程思维解决修仙问题"
        },
        {
            "name": "李长老",
            "role": "青云宗长老",
            "description": "慧眼识才，对林枫颇为欣赏"
        }
    ]

    world_setting = {
        "locations": [
            {"name": "青云宗", "description": "修仙界的中等宗门，有内外两门"}
        ],
        "factions": [
            {"name": "青云宗", "description": "主角所在宗门"}
        ],
        "rules": [
            {"title": "系统规则", "content": "可以用代码编写法术，消耗灵力运行"}
        ],
        "timeline": []
    }

    print("\n📝 测试场景:")
    print(f"- 现有章节: {len(existing_outlines)} 章")
    print(f"- 续写起始: 第 4 章")
    print(f"- 续写数量: 3 章")
    print(f"- RAG 上下文: {len(rag_context)} 条")
    print()

    # 初始化服务
    service = NovelGenerationService()

    # 测试 1: 不使用 RAG 的续写
    print("\n" + "=" * 80)
    print("测试 1: 基础续写模式（不使用 RAG）")
    print("=" * 80)

    try:
        result1 = await service.generate_outline(
            premise=premise,
            characters=characters,
            world_setting=world_setting,
            chapter_count=3,
            style="轻松爽文，节奏明快",
            mode="continue",
            existing_outlines=existing_outlines,
            start_chapter=4,
            rag_context=None  # 不使用 RAG
        )

        print("\n✅ 基础续写成功!")
        print(f"生成章节数: {len(result1.get('chapters', []))}")
        for ch in result1.get("chapters", []):
            print(f"  - 第 {ch['chapter_number']} 章: {ch['title']}")
    except Exception as e:
        print(f"\n❌ 基础续写失败: {str(e)}")

    # 测试 2: 使用 RAG 增强的续写
    print("\n" + "=" * 80)
    print("测试 2: RAG 增强续写模式")
    print("=" * 80)

    try:
        result2 = await service.generate_outline(
            premise=premise,
            characters=characters,
            world_setting=world_setting,
            chapter_count=3,
            style="轻松爽文，节奏明快",
            mode="continue",
            existing_outlines=existing_outlines,
            start_chapter=4,
            rag_context=rag_context  # 使用 RAG
        )

        print("\n✅ RAG 增强续写成功!")
        print(f"生成章节数: {len(result2.get('chapters', []))}")
        for ch in result2.get("chapters", []):
            print(f"\n第 {ch['chapter_number']} 章: {ch['title']}")
            print(f"  大纲: {ch['outline'][:100]}...")
            print(f"  关键事件: {', '.join(ch.get('key_events', [])[:3])}")
    except Exception as e:
        print(f"\n❌ RAG 增强续写失败: {str(e)}")

    print("\n" + "=" * 80)
    print("✨ 测试完成")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_outline_continuation())
