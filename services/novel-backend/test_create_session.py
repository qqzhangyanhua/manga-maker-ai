"""测试 create_session 完整流程"""
import asyncio
import uuid
from app.services.workflow_service import workflow_service
from app.database import AsyncSessionLocal

async def test():
    print("测试 workflow_service.create_session")
    print("=" * 60)
    
    # 使用有效的 UUID 作为 user_id
    user_id = str(uuid.uuid4())
    print(f"测试 user_id: {user_id}")
    
    async with AsyncSessionLocal() as session:
        result = await workflow_service.create_session(
            user_id=user_id,
            genre=None,
            session=session
        )
        
        print(f"\nsession_id: {result['session_id']}")
        print(f"current_phase: {result['current_phase']}")
        print(f"available_templates 数量: {len(result['available_templates'])}")
        
        if result['available_templates']:
            print(f"\n前3个模板:")
            for t in result['available_templates'][:3]:
                print(f"  - {t['name']} (id={t['id'][:8]}...)")
        else:
            print("\n⚠️ available_templates 为空!")
            print("检查 workflow_templates 返回值...")
            
            # 直接调用 template_service 看看
            from app.services.template_service import template_service
            from app.utils import clean_genre
            
            cleaned_genre = clean_genre(None)
            print(f"  cleaned_genre = {cleaned_genre}")
            
            # 不传 session 测试
            workflow_templates = await template_service.get_workflow_templates(
                genre=cleaned_genre, session=None
            )
            
            print(f"\n  直接调用 template_service (session=None):")
            for phase, data in workflow_templates.items():
                print(f"    {phase}: {len(data['templates'])} 个模板")

if __name__ == "__main__":
    asyncio.run(test())
