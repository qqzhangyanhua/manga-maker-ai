# -*- coding: utf-8 -*-
"""分解查询时间"""
import asyncio
import time
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import asyncpg

async def test():
    print("=" * 60)
    print("查询时间分解分析")
    print("=" * 60)
    
    dsn = "postgresql://cartoon:3MRL8JKw5fn5Njy5@111.228.37.74:5432/cartoon"
    
    # 创建连接
    print("\n[1] 建立连接...")
    start = time.time()
    conn = await asyncpg.connect(dsn)
    print(f"  连接耗时: {(time.time() - start) * 1000:.2f}ms")
    
    # 连续执行多个查询
    print("\n[2] 连续查询测试（复用连接）:")
    for i in range(5):
        start = time.time()
        await conn.fetchval("SELECT 1")
        print(f"  查询 {i+1}: {(time.time() - start) * 1000:.2f}ms")
    
    # 测试 prepared statement
    print("\n[3] Prepared Statement 测试:")
    start = time.time()
    stmt = await conn.prepare("SELECT id, name FROM writing_prompt_templates WHERE phase = $1 LIMIT 5")
    print(f"  准备语句: {(time.time() - start) * 1000:.2f}ms")
    
    for i in range(3):
        start = time.time()
        rows = await stmt.fetch("creative")
        print(f"  执行 {i+1}: {(time.time() - start) * 1000:.2f}ms, 返回 {len(rows)} 行")
    
    # 测试批量查询 vs 单个查询
    print("\n[4] 批量 vs 单个查询:")
    
    # 单个查询
    start = time.time()
    for phase in ["creative", "setting", "framework", "writing"]:
        await conn.fetch(f"SELECT id, name FROM writing_prompt_templates WHERE phase = '{phase}' AND genre IS NULL")
    single_time = (time.time() - start) * 1000
    print(f"  4 个单独查询: {single_time:.2f}ms")
    
    # 批量查询
    start = time.time()
    await conn.fetch("""
        SELECT id, name, phase FROM writing_prompt_templates 
        WHERE phase IN ('creative', 'setting', 'framework', 'writing') AND genre IS NULL
    """)
    batch_time = (time.time() - start) * 1000
    print(f"  1 个批量查询: {batch_time:.2f}ms")
    
    # 检查是否有 SSL
    print("\n[5] 连接信息:")
    ssl_in_use = conn.get_settings().get('ssl', 'unknown')
    print(f"  SSL: {ssl_in_use}")
    
    await conn.close()
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(test())
