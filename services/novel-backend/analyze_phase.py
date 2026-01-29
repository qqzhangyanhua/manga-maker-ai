# -*- coding: utf-8 -*-
"""分析模板 phase 设置问题"""
import asyncio
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database import AsyncSessionLocal
from sqlalchemy import text

async def analyze():
    async with AsyncSessionLocal() as session:
        # 查看狗血女文模板的具体名称
        result = await session.execute(
            text("SELECT name, phase FROM writing_prompt_templates WHERE genre = :genre ORDER BY name"),
            {"genre": "狗血女文"}
        )
        rows = result.fetchall()
        
        print("狗血女文模板 phase 分析:")
        print("=" * 60)
        
        phase_mapping = {
            "创意阶段": "creative",
            "设定阶段": "setting", 
            "框架阶段": "framework",
            "创作阶段": "writing",
        }
        
        fixes_needed = []
        for row in rows:
            name = row.name
            current_phase = row.phase
            
            # 从名称推断应该的 phase
            expected_phase = "other"
            for keyword, phase in phase_mapping.items():
                if keyword in name:
                    expected_phase = phase
                    break
            
            if current_phase != expected_phase:
                fixes_needed.append({
                    "name": name,
                    "current": current_phase,
                    "expected": expected_phase
                })
                print(f"[需修复] {name}")
                print(f"         当前: {current_phase} -> 应为: {expected_phase}")
        
        print()
        print(f"共需修复: {len(fixes_needed)} 个模板")
        
        # 统计所有专题模板的 phase 情况
        print()
        print("=" * 60)
        print("所有专题模板的 phase 分布:")
        print("=" * 60)
        
        result = await session.execute(text("""
            SELECT genre, phase, COUNT(*) as cnt
            FROM writing_prompt_templates
            WHERE genre IS NOT NULL
            GROUP BY genre, phase
            ORDER BY genre, phase
        """))
        rows = result.fetchall()
        
        current_genre = None
        for row in rows:
            if row.genre != current_genre:
                if current_genre is not None:
                    print()
                current_genre = row.genre
                print(f"[{row.genre}]")
            print(f"  {row.phase}: {row.cnt}")

if __name__ == "__main__":
    asyncio.run(analyze())
