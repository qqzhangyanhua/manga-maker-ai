# -*- coding: utf-8 -*-
"""测试数据库连接性能 - 深入分析"""
import asyncio
import time
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def test():
    print("=" * 60)
    print("数据库连接性能深入分析")
    print("=" * 60)
    
    # 1. 测试原生 asyncpg 连接
    print("\n[1] 原生 asyncpg 连接测试")
    import asyncpg
    
    dsn = "postgresql://cartoon:3MRL8JKw5fn5Njy5@111.228.37.74:5432/cartoon"
    
    start = time.time()
    conn = await asyncpg.connect(dsn)
    connect_time = (time.time() - start) * 1000
    print(f"  首次连接耗时: {connect_time:.2f}ms")
    
    # 简单查询
    start = time.time()
    result = await conn.fetchval("SELECT 1")
    query_time = (time.time() - start) * 1000
    print(f"  简单查询 (SELECT 1): {query_time:.2f}ms")
    
    # 模板查询
    start = time.time()
    result = await conn.fetch("SELECT COUNT(*) FROM writing_prompt_templates")
    query_time = (time.time() - start) * 1000
    print(f"  COUNT 查询: {query_time:.2f}ms")
    
    await conn.close()
    
    # 2. 测试连接池
    print("\n[2] asyncpg 连接池测试")
    start = time.time()
    pool = await asyncpg.create_pool(dsn, min_size=1, max_size=5)
    pool_create_time = (time.time() - start) * 1000
    print(f"  创建连接池: {pool_create_time:.2f}ms")
    
    # 从池获取连接
    start = time.time()
    async with pool.acquire() as conn:
        acquire_time = (time.time() - start) * 1000
        print(f"  获取连接: {acquire_time:.2f}ms")
        
        start = time.time()
        await conn.fetchval("SELECT 1")
        query_time = (time.time() - start) * 1000
        print(f"  查询: {query_time:.2f}ms")
    
    # 再次获取（应该很快，连接已建立）
    start = time.time()
    async with pool.acquire() as conn:
        acquire_time = (time.time() - start) * 1000
        print(f"  再次获取连接: {acquire_time:.2f}ms")
    
    await pool.close()
    
    # 3. 测试 SQLAlchemy
    print("\n[3] SQLAlchemy AsyncSession 测试")
    from app.database import AsyncSessionLocal
    from sqlalchemy import text
    
    start = time.time()
    async with AsyncSessionLocal() as session:
        session_create_time = (time.time() - start) * 1000
        print(f"  创建 Session: {session_create_time:.2f}ms")
        
        start = time.time()
        await session.execute(text("SELECT 1"))
        query_time = (time.time() - start) * 1000
        print(f"  首次查询: {query_time:.2f}ms")
        
        start = time.time()
        await session.execute(text("SELECT 1"))
        query_time = (time.time() - start) * 1000
        print(f"  第二次查询: {query_time:.2f}ms")
    
    # 再次创建 session
    start = time.time()
    async with AsyncSessionLocal() as session:
        session_create_time = (time.time() - start) * 1000
        print(f"  再次创建 Session: {session_create_time:.2f}ms")
        
        start = time.time()
        await session.execute(text("SELECT 1"))
        query_time = (time.time() - start) * 1000
        print(f"  查询: {query_time:.2f}ms")
    
    print("\n" + "=" * 60)
    print("分析完成")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test())
