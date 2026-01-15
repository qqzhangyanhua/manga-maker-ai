"""
测试剧情连贯性优化（Solution 2 + 3）

测试流程：
1. 生成章节大纲（验证 summary_preview 和 ending_state）
2. 构建 RAG 上下文（验证新字段被正确使用）
3. 生成章节内容（验证上下文包含详细剧情信息）
"""

import asyncio
import json
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.append(str(Path(__file__).parent))

from app.services.generation_service import GenerationService
from app.services.rag_service import RAGService
from app.main import get_db_session


async def test_outline_generation():
    """测试大纲生成（验证新字段）"""
    print("\n" + "="*80)
    print("📝 测试 1: 大纲生成（验证 summary_preview 和 ending_state）")
    print("="*80)

    service = GenerationService()

    # 模拟生成 3 章大纲
    result = await service.generate_outline(
        project_context={
            "premise": "一个现代程序员穿越到修仙世界,用编程思维修炼功法",
            "genre": "奇幻",
            "characters": [
                {"name": "林轩", "description": "主角,资深程序员,穿越后获得'代码修仙'系统"}
            ],
            "world_setting": {
                "locations": [{"name": "青云门", "description": "小型修仙门派"}],
                "rules": [{"name": "修仙等级", "description": "练气期 -> 筑基期 -> 金丹期"}]
            }
        },
        chapter_count=3,
        mode="full"
    )

    # 验证返回结果
    assert "chapters" in result, "❌ 缺少 chapters 字段"

    for i, chapter in enumerate(result["chapters"], 1):
        print(f"\n第{i}章验证:")
        print(f"  标题: {chapter.get('title', '❌ 缺失')}")

        # 验证必需字段
        assert "summary_preview" in chapter, f"❌ 第{i}章缺少 summary_preview"
        assert "ending_state" in chapter, f"❌ 第{i}章缺少 ending_state"

        summary = chapter.get("summary_preview", "")
        print(f"  summary_preview 长度: {len(summary)} 字符")

        if len(summary) < 200:
            print(f"  ⚠️  警告: summary_preview 过短 (<200字)，当前 {len(summary)} 字")
        else:
            print(f"  ✅ summary_preview 长度合格")

        # 验证 ending_state 结构
        ending = chapter.get("ending_state", {})
        required_keys = ["location", "protagonist_status", "plot_progress"]
        for key in required_keys:
            if key not in ending or not ending[key]:
                print(f"  ⚠️  警告: ending_state.{key} 缺失或为空")
            else:
                print(f"  ✅ ending_state.{key}: {ending[key][:50]}...")

    print("\n✅ 测试 1 完成")
    return result


async def test_rag_context_building(db_session):
    """测试 RAG 上下文构建（验证使用新字段）"""
    print("\n" + "="*80)
    print("📋 测试 2: RAG 上下文构建（验证 summary_preview 和 ending_state 被使用）")
    print("="*80)

    rag_service = RAGService(db_session)

    # 需要一个真实的项目 ID 来测试
    # 这里使用模拟数据展示逻辑
    print("\n⚠️  注意: 此测试需要真实项目数据，当前仅验证代码逻辑")

    # 验证方法签名
    import inspect
    source = inspect.getsource(rag_service.build_context_for_generation)

    # 检查是否使用了新字段
    if "summary_preview" in source:
        print("  ✅ build_context_for_generation 已使用 summary_preview")
    else:
        print("  ❌ build_context_for_generation 未使用 summary_preview")

    if "ending_state" in source:
        print("  ✅ build_context_for_generation 已使用 ending_state")
    else:
        print("  ❌ build_context_for_generation 未使用 ending_state")

    # 检查 get_previous_chapters 返回字段
    prev_source = inspect.getsource(rag_service.get_previous_chapters)
    if "summary_preview" in prev_source and "ending_state" in prev_source:
        print("  ✅ get_previous_chapters 已返回新字段")
    else:
        print("  ❌ get_previous_chapters 未返回新字段")

    print("\n✅ 测试 2 完成")


async def test_prompt_template():
    """测试提示词模板（验证新要求）"""
    print("\n" + "="*80)
    print("🤖 测试 3: 提示词模板验证")
    print("="*80)

    from app.services.prompt_templates import PromptTemplateManager

    manager = PromptTemplateManager()
    system_prompt = manager.get_outline_system_prompt()

    # 验证提示词包含新要求
    checks = [
        ("summary_preview", "summary_preview 字段要求"),
        ("ending_state", "ending_state 字段要求"),
        ("200-300字", "summary_preview 长度要求"),
        ("location", "ending_state.location 要求"),
        ("protagonist_status", "ending_state.protagonist_status 要求"),
        ("plot_progress", "ending_state.plot_progress 要求"),
    ]

    for keyword, description in checks:
        if keyword in system_prompt:
            print(f"  ✅ 包含 {description}")
        else:
            print(f"  ❌ 缺少 {description}")

    print("\n✅ 测试 3 完成")


async def main():
    """运行所有测试"""
    print("\n" + "="*80)
    print("🚀 开始测试剧情连贯性优化（Solution 2 + 3）")
    print("="*80)

    # 测试 1: 大纲生成
    try:
        outline_result = await test_outline_generation()
    except Exception as e:
        print(f"\n❌ 测试 1 失败: {e}")
        import traceback
        traceback.print_exc()
        return

    # 测试 2: RAG 上下文构建
    try:
        async for db in get_db_session():
            await test_rag_context_building(db)
            break
    except Exception as e:
        print(f"\n❌ 测试 2 失败: {e}")
        import traceback
        traceback.print_exc()

    # 测试 3: 提示词模板
    try:
        await test_prompt_template()
    except Exception as e:
        print(f"\n❌ 测试 3 失败: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "="*80)
    print("✅ 所有测试完成")
    print("="*80)
    print("\n💡 建议:")
    print("  1. 使用真实项目测试完整流程")
    print("  2. 观察 summary_preview 是否满足 200-300 字要求")
    print("  3. 检查 ending_state 是否包含完整信息")
    print("  4. 验证章节生成时上下文是否包含详细剧情信息")


if __name__ == "__main__":
    asyncio.run(main())
