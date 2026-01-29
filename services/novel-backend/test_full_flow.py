# -*- coding: utf-8 -*-
"""测试完整的 create_session 流程"""
import asyncio
import uuid
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.services.workflow_service import workflow_service
from app.database import AsyncSessionLocal

async def test():
    print("=" * 60)
    print("测试 create_session 完整流程")
    print("=" * 60)
    
    user_id = str(uuid.uuid4())
    
    # 测试1: genre=None
    print("\n[1] genre=None:")
    async with AsyncSessionLocal() as session:
        result = await workflow_service.create_session(
            user_id=user_id,
            genre=None,
            session=session
        )
        print(f"  available_templates: {len(result['available_templates'])} 个")
    
    # 测试2: genre='狗血女文'
    print("\n[2] genre='狗血女文':")
    async with AsyncSessionLocal() as session:
        result = await workflow_service.create_session(
            user_id=user_id,
            genre="狗血女文",
            session=session
        )
        print(f"  available_templates: {len(result['available_templates'])} 个")
        if result['available_templates']:
            print("  模板列表:")
            for t in result['available_templates']:
                print(f"    - {t['name']}")
        else:
            print("  [问题] 没有返回模板!")
            
            # 调试：直接查询
            print("\n  调试：直接查询数据库...")
            from app.services.template_service import template_service
            from app.utils import clean_genre
            
            cleaned = clean_genre("狗血女文")
            print(f"  clean_genre('狗血女文') = {repr(cleaned)}")
            
            templates = await template_service.get_workflow_templates(
                genre=cleaned, session=None
            )
            for phase, data in templates.items():
                print(f"    {phase}: {len(data.get('templates', []))} 个")

if __name__ == "__main__":
    asyncio.run(test())
