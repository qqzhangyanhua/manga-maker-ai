"""检查数据库模板数据"""
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check_data():
    async with AsyncSessionLocal() as session:
        # 1. 检查总模板数
        result = await session.execute(text('SELECT COUNT(*) FROM writing_prompt_templates'))
        total = result.scalar()
        print(f'总模板数: {total}')
        
        # 2. 检查各阶段模板数
        result = await session.execute(text('''
            SELECT phase, COUNT(*) as cnt 
            FROM writing_prompt_templates 
            WHERE is_active = true
            GROUP BY phase
            ORDER BY phase
        '''))
        rows = result.fetchall()
        print(f'\n各阶段模板数 (is_active=true):')
        for row in rows:
            print(f'  {row.phase}: {row.cnt}')
        
        # 3. 检查 creative 阶段的前5个模板
        result = await session.execute(text('''
            SELECT id, name, phase, genre, is_active
            FROM writing_prompt_templates 
            WHERE phase = 'creative'
            LIMIT 5
        '''))
        rows = result.fetchall()
        print(f'\nCreative 阶段模板示例:')
        for row in rows:
            print(f'  {row.name} | genre={row.genre} | is_active={row.is_active}')
        
        # 4. 检查 genre 分布
        result = await session.execute(text('''
            SELECT genre, COUNT(*) as cnt
            FROM writing_prompt_templates
            WHERE is_active = true
            GROUP BY genre
        '''))
        rows = result.fetchall()
        print(f'\nGenre 分布:')
        for row in rows:
            print(f'  {row.genre or "NULL"}: {row.cnt}')
        
        # 5. 检查工作流阶段模板 (creative, setting, framework, writing)
        result = await session.execute(text('''
            SELECT phase, genre, COUNT(*) as cnt
            FROM writing_prompt_templates
            WHERE is_active = true AND phase IN ('creative', 'setting', 'framework', 'writing')
            GROUP BY phase, genre
            ORDER BY phase, genre
        '''))
        rows = result.fetchall()
        print(f'\n工作流阶段模板分布:')
        for row in rows:
            print(f'  {row.phase} | genre={row.genre or "NULL"}: {row.cnt}')

if __name__ == "__main__":
    asyncio.run(check_data())
