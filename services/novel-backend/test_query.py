"""测试工作流模板查询"""
import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def test_query():
    async with AsyncSessionLocal() as session:
        # 模拟 _get_workflow_templates_internal 的查询
        WORKFLOW_PHASES = ["creative", "setting", "framework", "writing"]
        
        # 测试1: 查询 genre IS NULL 的工作流模板
        print("=" * 60)
        print("测试1: 查询 genre IS NULL 的工作流模板")
        print("=" * 60)
        
        phase_placeholders = ", ".join([f"'{phase}'" for phase in WORKFLOW_PHASES])
        query = text(f"""
            SELECT id, name, phase, genre
            FROM writing_prompt_templates
            WHERE is_active = true 
              AND phase IN ({phase_placeholders})
              AND genre IS NULL
            ORDER BY phase, sort_order ASC
        """)
        result = await session.execute(query)
        rows = result.fetchall()
        
        print(f"返回 {len(rows)} 条记录:")
        for row in rows:
            print(f"  {row.phase}: {row.name} | genre={row.genre}")
        
        # 测试2: 查询所有工作流阶段模板（不管 genre）
        print("\n" + "=" * 60)
        print("测试2: 查询所有工作流阶段模板（不管 genre）")
        print("=" * 60)
        
        query = text(f"""
            SELECT phase, genre, COUNT(*) as cnt
            FROM writing_prompt_templates
            WHERE is_active = true 
              AND phase IN ({phase_placeholders})
            GROUP BY phase, genre
            ORDER BY phase, genre
        """)
        result = await session.execute(query)
        rows = result.fetchall()
        
        print(f"返回 {len(rows)} 条记录:")
        for row in rows:
            print(f"  {row.phase} | genre={row.genre or 'NULL'}: {row.cnt}")
        
        # 测试3: 查询 genre = '多子多福' 的模板
        print("\n" + "=" * 60)
        print("测试3: 查询 genre = '多子多福' 的模板（前10个）")
        print("=" * 60)
        
        query = text("""
            SELECT id, name, phase, genre
            FROM writing_prompt_templates
            WHERE is_active = true AND genre = '多子多福'
            ORDER BY phase, sort_order ASC
            LIMIT 10
        """)
        result = await session.execute(query)
        rows = result.fetchall()
        
        print(f"返回 {len(rows)} 条记录:")
        for row in rows:
            print(f"  {row.phase}: {row.name}")

if __name__ == "__main__":
    asyncio.run(test_query())
