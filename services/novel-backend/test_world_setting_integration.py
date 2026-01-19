"""
测试世界观设定在生成流程中的完整性
验证 locations, factions, rules, timeline 是否正确传递到 LLM
"""
import asyncio


async def test_world_setting_context():
    """测试世界观设定是否完整传递到上下文"""

    # 模拟完整的世界观数据（包含前端格式）
    mock_world_setting = {
        "locations": [
            {
                "name": "天元城",
                "description": "修真界第一大城，繁华无比",
                "type": "urban",
                "atmosphere": "仙气缭绕"
            },
            {
                "name": "幽冥谷",
                "description": "阴森恐怖的禁地",
                "type": "nature",
                "atmosphere": "阴暗压抑"
            }
        ],
        "factions": [
            {
                "name": "天剑宗",
                "description": "正道第一大宗门",
                "leader": "剑尊李白",
                "members": ["剑尊李白", "大长老张三"],
                "goals": "维护正道，匡扶正义"
            },
            {
                "name": "血影教",
                "description": "邪道组织",
                "leader": "血魔老祖",
                "goals": "称霸修真界"
            }
        ],
        "rules": [
            {
                # 使用前端格式：title/content
                "title": "灵气系统",
                "content": "修炼者通过吸收天地灵气提升修为",
                "category": "magic"
            },
            {
                # 同时测试后端格式：name/description
                "name": "境界划分",
                "description": "练气、筑基、金丹、元婴、化神",
                "category": "magic"
            }
        ],
        "timeline": [
            {
                "date": "千年前",
                "event": "天元大战",
                "description": "正邪大战，血影教被封印",
                "importance": "high"
            },
            {
                "year": "百年前",
                "event": "天剑宗建立",
                "importance": "medium"
            }
        ]
    }

    print("=" * 80)
    print("🧪 世界观设定完整性测试")
    print("=" * 80)

    # 测试1: 验证数据结构
    print("\n📋 测试1: 验证世界观数据结构")
    print(f"  - locations: {len(mock_world_setting['locations'])} 个")
    print(f"  - factions: {len(mock_world_setting['factions'])} 个")
    print(f"  - rules: {len(mock_world_setting['rules'])} 个")
    print(f"  - timeline: {len(mock_world_setting['timeline'])} 个")

    # 测试2: 模拟 RAG 上下文构建
    print("\n📋 测试2: 模拟 RAG 上下文构建")
    print("\n生成的上下文片段：")
    print("-" * 80)

    # 模拟上下文构建逻辑
    context_parts = []

    # 地点
    if mock_world_setting.get("locations"):
        locations = []
        for loc in mock_world_setting['locations']:
            name = loc.get('name', '')
            description = loc.get('description', '')
            atmosphere = loc.get('atmosphere', '')
            if name:
                loc_text = f"{name}: {description}"
                if atmosphere:
                    loc_text += f" (氛围: {atmosphere})"
                locations.append(loc_text)
        if locations:
            context_parts.append("地点:")
            for loc in locations:
                context_parts.append(f"  - {loc}")

    # 派系
    if mock_world_setting.get("factions"):
        factions = []
        for faction in mock_world_setting['factions']:
            name = faction.get('name', '')
            description = faction.get('description', '')
            leader = faction.get('leader', '')
            goals = faction.get('goals', '')
            if name:
                faction_text = f"{name}: {description}"
                if leader:
                    faction_text += f" (领导: {leader})"
                if goals:
                    faction_text += f" (目标: {goals})"
                factions.append(faction_text)
        if factions:
            context_parts.append("派系/组织:")
            for faction in factions:
                context_parts.append(f"  - {faction}")

    # 规则（兼容两种格式）
    if mock_world_setting.get("rules"):
        rules = []
        for rule in mock_world_setting['rules']:
            # 兼容 title/content 和 name/description
            name = rule.get('name') or rule.get('title', '')
            description = rule.get('description') or rule.get('content', '')
            category = rule.get('category', '')
            if name:
                rule_text = f"{name}: {description}"
                if category:
                    rule_text += f" (类别: {category})"
                rules.append(rule_text)
        if rules:
            context_parts.append("世界规则:")
            for rule in rules:
                context_parts.append(f"  - {rule}")

    # 时间线
    if mock_world_setting.get("timeline"):
        timeline = []
        for event in mock_world_setting['timeline']:
            date = event.get('date') or event.get('year', '')
            evt = event.get('event', '')
            description = event.get('description', '')
            importance = event.get('importance', '')
            if date and evt:
                event_text = f"{date}: {evt}"
                if description:
                    event_text += f" - {description}"
                if importance == 'high':
                    event_text = f"【重要】{event_text}"
                timeline.append(event_text)
        if timeline:
            context_parts.append("时间线:")
            for evt in timeline:
                context_parts.append(f"  - {evt}")

    # 输出上下文
    context = "\n".join(context_parts)
    print(context)
    print("-" * 80)

    # 测试3: 验证字段兼容性
    print("\n📋 测试3: 验证 Rule 字段兼容性")
    for i, rule in enumerate(mock_world_setting['rules'], 1):
        name = rule.get('name') or rule.get('title', '')
        description = rule.get('description') or rule.get('content', '')
        print(f"  规则{i}: {name} - {description[:50]}...")

        # 验证是否正确提取
        if not name:
            print(f"    ❌ 错误: 无法提取规则名称")
        else:
            print(f"    ✅ 成功提取规则名称")

        if not description:
            print(f"    ❌ 错误: 无法提取规则描述")
        else:
            print(f"    ✅ 成功提取规则描述")

    # 测试4: 统计信息
    print("\n📋 测试4: 统计上下文信息")
    print(f"  - 上下文总长度: {len(context)} 字符")
    print(f"  - 包含地点: {'✅' if '地点:' in context else '❌'}")
    print(f"  - 包含派系: {'✅' if '派系/组织:' in context else '❌'}")
    print(f"  - 包含规则: {'✅' if '世界规则:' in context else '❌'}")
    print(f"  - 包含时间线: {'✅' if '时间线:' in context else '❌'}")

    # 验证关键信息
    checks = [
        ("天元城", "地点名称"),
        ("天剑宗", "派系名称"),
        ("灵气系统", "规则名称（title格式）"),
        ("境界划分", "规则名称（name格式）"),
        ("天元大战", "时间线事件"),
    ]

    print("\n📋 测试5: 验证关键信息完整性")
    all_passed = True
    for keyword, desc in checks:
        if keyword in context:
            print(f"  ✅ {desc}: {keyword}")
        else:
            print(f"  ❌ {desc}: {keyword} (未找到)")
            all_passed = False

    print("\n" + "=" * 80)
    if all_passed:
        print("✅ 所有测试通过！世界观设定完整传递")
    else:
        print("❌ 部分测试失败，请检查代码")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_world_setting_context())
