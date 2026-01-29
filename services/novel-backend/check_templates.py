import asyncio
from app.services.template_service import template_service
import json

async def check_templates():
    print("=" * 80)
    print("检查数据库中的模板数据")
    print("=" * 80)
    
    # 检查创意阶段模板
    print("\n1. 创意阶段 (creative) 模板:")
    creative = await template_service.get_templates(phase='creative', limit=10)
    print(f"   总数: {creative['total']}")
    print(f"   返回: {len(creative['templates'])}")
    if creative['templates']:
        print(f"   第一个模板: {creative['templates'][0]['name']}")
    
    # 检查所有阶段
    print("\n2. 所有阶段的模板统计:")
    phases = await template_service.get_phases_with_templates(genre=None)
    for phase in phases:
        print(f"   {phase['phase']:12} - {phase['display_name']:10} - {phase['count']} 个模板")
    
    # 检查工作流模板
    print("\n3. 工作流推荐模板:")
    workflow = await template_service.get_workflow_templates(genre=None)
    for phase_key, phase_data in workflow.items():
        print(f"   {phase_key:12} - {len(phase_data['templates'])} 个模板")
        if phase_data['templates']:
            print(f"      第一个: {phase_data['templates'][0]['name']}")
    
    # 检查专题
    print("\n4. 专题 (genres):")
    genres = await template_service.get_genres()
    for genre in genres[:5]:
        print(f"   {genre['genre']:20} - {genre['display_name']:20} - {genre['count']} 个模板")
    
    # 查询所有模板（前10个）
    print("\n5. 数据库中前10个模板（不过滤）:")
    all_templates = await template_service.get_templates(limit=10)
    print(f"   总数: {all_templates['total']}")
    for t in all_templates['templates']:
        print(f"   - [{t['phase']:10}] {t['name'][:40]:40} (genre: {t['genre'] or 'general'})")

if __name__ == "__main__":
    asyncio.run(check_templates())
