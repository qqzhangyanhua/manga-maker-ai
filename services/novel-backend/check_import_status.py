"""
检查模板导入状态
"""
import asyncio
from app.services.template_service import template_service

async def check():
    print("=" * 60)
    print("模板导入状态检查")
    print("=" * 60)
    
    # 1. 检查所有模板总数
    all_templates = await template_service.get_templates(limit=1)
    print(f"\n总模板数: {all_templates['total']}")
    
    # 2. 检查各专题的模板数
    genres = await template_service.get_genres()
    print(f"\n专题列表 ({len(genres)} 个):")
    for g in genres:
        print(f"  - {g['display_name']:25} {g['count']:4} 个模板")
    
    # 3. 检查工作流模板（多子多福专题）
    print("\n工作流模板（多子多福）:")
    workflow = await template_service.get_workflow_templates(genre="多子多福")
    for phase_key, phase_data in workflow.items():
        print(f"  {phase_key:12} - {len(phase_data['templates']):2} 个模板")
    
    print("\n" + "=" * 60)
    if all_templates['total'] > 500:
        print("✅ 导入完成！专题模板已就绪")
    else:
        print(f"⚠️  导入中... 当前已有 {all_templates['total']} 个模板")

if __name__ == "__main__":
    asyncio.run(check())
