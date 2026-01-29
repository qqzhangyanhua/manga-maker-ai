"""测试 template_service"""
import asyncio
from app.services.template_service import template_service
from app.utils import clean_genre

async def test():
    print("=" * 60)
    print("测试 template_service.get_workflow_templates")
    print("=" * 60)
    
    # 测试1: genre=None
    print("\n1. genre=None:")
    result = await template_service.get_workflow_templates(genre=None)
    for phase, data in result.items():
        print(f"  {phase}: {len(data['templates'])} 个模板")
        if data['templates']:
            print(f"    第一个: {data['templates'][0]['name']}")
    
    # 测试2: genre="general"
    print("\n2. genre='general':")
    cleaned = clean_genre("general")
    print(f"  clean_genre('general') = {cleaned}")
    result = await template_service.get_workflow_templates(genre=cleaned)
    for phase, data in result.items():
        print(f"  {phase}: {len(data['templates'])} 个模板")
    
    # 测试3: genre="   " (空格)
    print("\n3. genre='   ' (空格):")
    cleaned = clean_genre("   ")
    print(f"  clean_genre('   ') = {cleaned}")
    result = await template_service.get_workflow_templates(genre=cleaned)
    for phase, data in result.items():
        print(f"  {phase}: {len(data['templates'])} 个模板")
    
    # 测试4: 直接获取 creative 阶段模板
    print("\n4. 直接获取 creative 阶段模板:")
    result = await template_service.get_templates(phase="creative", genre=None, limit=10)
    print(f"  总数: {result['total']}")
    print(f"  返回: {len(result['templates'])}")
    for t in result['templates'][:3]:
        print(f"    - {t['name']} (genre={t['genre']})")

if __name__ == "__main__":
    asyncio.run(test())
