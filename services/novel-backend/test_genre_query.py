# -*- coding: utf-8 -*-
"""测试 genre 查询"""
import asyncio
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database import AsyncSessionLocal
from sqlalchemy import text
from app.services.template_service import template_service
from app.utils import clean_genre

async def test():
    print("=" * 60)
    print("测试 genre='狗血女文' 的查询")
    print("=" * 60)
    
    # 1. 测试 clean_genre
    test_values = ["狗血女文", "  狗血女文  ", None, "", "   ", "general"]
    print("\n[1] clean_genre 函数测试:")
    for v in test_values:
        cleaned = clean_genre(v)
        print(f"  clean_genre({repr(v)}) = {repr(cleaned)}")
    
    # 2. 直接查询数据库
    print("\n[2] 直接数据库查询:")
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("""
                SELECT phase, COUNT(*) as cnt
                FROM writing_prompt_templates
                WHERE is_active = true
                  AND genre = '狗血女文'
                  AND phase IN ('creative', 'setting', 'framework', 'writing')
                GROUP BY phase
            """)
        )
        rows = result.fetchall()
        
        print(f"  结果: {len(rows)} 行")
        for row in rows:
            print(f"    {row.phase}: {row.cnt}")
    
    # 3. 测试 template_service.get_workflow_templates
    print("\n[3] template_service.get_workflow_templates 测试:")
    
    # 使用 '狗血女文'
    result = await template_service.get_workflow_templates(genre="狗血女文")
    print("  genre='狗血女文':")
    for phase, data in result.items():
        count = len(data.get("templates", []))
        print(f"    {phase}: {count} 个模板")
        if count > 0:
            print(f"      第一个: {data['templates'][0]['name']}")

if __name__ == "__main__":
    asyncio.run(test())
