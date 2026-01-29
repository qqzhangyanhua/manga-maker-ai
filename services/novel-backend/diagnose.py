# -*- coding: utf-8 -*-
"""完整诊断脚本：检查数据、查询性能、API响应"""
import asyncio
import time
import uuid
import sys
import io

# 修复 Windows 编码问题
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.database import AsyncSessionLocal
from sqlalchemy import text

async def diagnose():
    print("=" * 70)
    print("诊断开始：检查数据库数据和查询性能")
    print("=" * 70)
    
    async with AsyncSessionLocal() as session:
        # =========================================
        # 1. 检查数据库连接性能
        # =========================================
        print("\n[1] 数据库连接测试")
        start = time.time()
        result = await session.execute(text("SELECT 1"))
        latency = (time.time() - start) * 1000
        print(f"  OK 连接延迟: {latency:.2f}ms")
        
        # =========================================
        # 2. 检查模板总数
        # =========================================
        print("\n[2] 模板数据统计")
        start = time.time()
        result = await session.execute(text("SELECT COUNT(*) FROM writing_prompt_templates"))
        total = result.scalar()
        latency = (time.time() - start) * 1000
        print(f"  总模板数: {total} (查询耗时: {latency:.2f}ms)")
        
        # =========================================
        # 3. 检查各阶段模板数（is_active=true）
        # =========================================
        print("\n[3] 各阶段模板数 (is_active=true)")
        start = time.time()
        result = await session.execute(text("""
            SELECT phase, COUNT(*) as cnt 
            FROM writing_prompt_templates 
            WHERE is_active = true
            GROUP BY phase
            ORDER BY phase
        """))
        rows = result.fetchall()
        latency = (time.time() - start) * 1000
        print(f"  (查询耗时: {latency:.2f}ms)")
        for row in rows:
            marker = "[*]" if row.phase in ["creative", "setting", "framework", "writing"] else "   "
            print(f"  {marker} {row.phase}: {row.cnt}")
        
        # =========================================
        # 4. 检查工作流阶段模板（核心查询）
        # =========================================
        print("\n[4] 工作流阶段模板查询 (genre IS NULL)")
        WORKFLOW_PHASES = ["creative", "setting", "framework", "writing"]
        phase_placeholders = ", ".join([f"'{p}'" for p in WORKFLOW_PHASES])
        
        start = time.time()
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
        latency = (time.time() - start) * 1000
        print(f"  返回: {len(rows)} 条 (查询耗时: {latency:.2f}ms)")
        
        # 按阶段分组统计
        phase_counts = {}
        for row in rows:
            phase_counts[row.phase] = phase_counts.get(row.phase, 0) + 1
        
        for phase in WORKFLOW_PHASES:
            count = phase_counts.get(phase, 0)
            status = "[OK]" if count > 0 else "[MISSING!]"
            print(f"  {status} {phase}: {count}")
        
        # =========================================
        # 5. 模拟完整的 create_session 流程
        # =========================================
        print("\n[5] 模拟 create_session 完整流程")
        from app.services.workflow_service import workflow_service
        
        user_id = str(uuid.uuid4())
        print(f"  测试 user_id: {user_id}")
        
        start = time.time()
        result = await workflow_service.create_session(
            user_id=user_id,
            genre=None,
            session=session
        )
        latency = (time.time() - start) * 1000
        
        templates_count = len(result.get("available_templates", []))
        print(f"  总耗时: {latency:.2f}ms")
        print(f"  session_id: {result['session_id']}")
        print(f"  available_templates 数量: {templates_count}")
        
        if templates_count > 0:
            print(f"  [SUCCESS] 前3个模板:")
            for t in result["available_templates"][:3]:
                print(f"    - {t['name']}")
        else:
            print(f"  [FAILED] available_templates 为空")
            
            # 深入调查
            print("\n  [深入调查]")
            from app.services.template_service import template_service
            
            workflow_templates = await template_service.get_workflow_templates(
                genre=None, session=session
            )
            print(f"  template_service.get_workflow_templates 返回:")
            for phase, data in workflow_templates.items():
                print(f"    {phase}: {len(data.get('templates', []))} 个模板")
        
        # =========================================
        # 6. 检查索引情况
        # =========================================
        print("\n[6] 检查数据库索引")
        result = await session.execute(text("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'writing_prompt_templates'
        """))
        rows = result.fetchall()
        print(f"  共 {len(rows)} 个索引:")
        for row in rows:
            print(f"    - {row.indexname}")
    
    print("\n" + "=" * 70)
    print("诊断完成")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(diagnose())
