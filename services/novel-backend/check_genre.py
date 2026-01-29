# -*- coding: utf-8 -*-
"""检查特定 genre 的模板数据"""
import asyncio
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        target_genre = '狗血女文'
        
        # 1. 检查该 genre 的所有模板
        print('=' * 60)
        print(f'检查 genre={target_genre} 的模板')
        print('=' * 60)
        
        result = await session.execute(
            text("SELECT id, name, phase, genre, is_active FROM writing_prompt_templates WHERE genre = :genre ORDER BY phase, sort_order"),
            {"genre": target_genre}
        )
        rows = result.fetchall()
        
        print(f'总数: {len(rows)}')
        print()
        
        # 按 phase 分组
        phases = {}
        for row in rows:
            phase = row.phase
            if phase not in phases:
                phases[phase] = []
            phases[phase].append(row)
        
        for phase, templates in sorted(phases.items()):
            print(f'[{phase}] ({len(templates)} 个):')
            for t in templates[:3]:
                print(f'  - {t.name} | is_active={t.is_active}')
            if len(templates) > 3:
                print(f'  ... 还有 {len(templates) - 3} 个')
        
        # 2. 检查工作流阶段的模板
        print()
        print('=' * 60)
        print(f'检查 genre={target_genre} 且 phase 为工作流阶段的模板')
        print('=' * 60)
        
        result = await session.execute(
            text("""
                SELECT phase, COUNT(*) as cnt
                FROM writing_prompt_templates
                WHERE genre = :genre 
                  AND phase IN ('creative', 'setting', 'framework', 'writing')
                  AND is_active = true
                GROUP BY phase
            """),
            {"genre": target_genre}
        )
        rows = result.fetchall()
        
        if rows:
            for row in rows:
                print(f'  {row.phase}: {row.cnt}')
        else:
            print('  没有找到任何记录!')
            print()
            print('  这说明该 genre 的模板 phase 都不是 creative/setting/framework/writing')
        
        # 3. 列出所有 genre 值
        print()
        print('=' * 60)
        print('数据库中所有 genre 值')
        print('=' * 60)
        
        result = await session.execute(text("""
            SELECT DISTINCT genre, COUNT(*) as cnt
            FROM writing_prompt_templates
            WHERE genre IS NOT NULL
            GROUP BY genre
            ORDER BY cnt DESC
        """))
        rows = result.fetchall()
        
        for row in rows:
            print(f'  {row.genre}: {row.cnt}')

if __name__ == "__main__":
    asyncio.run(check())
