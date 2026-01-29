# -*- coding: utf-8 -*-
"""检查 PostgreSQL 服务器状态"""
import asyncio
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import asyncpg

async def check():
    dsn = "postgresql://cartoon:3MRL8JKw5fn5Njy5@111.228.37.74:5432/cartoon"
    conn = await asyncpg.connect(dsn)
    
    print("=" * 60)
    print("PostgreSQL 服务器状态检查")
    print("=" * 60)
    
    # 1. 版本
    version = await conn.fetchval("SELECT version()")
    print(f"\n[1] 版本: {version[:60]}...")
    
    # 2. 当前连接数
    result = await conn.fetchrow("""
        SELECT 
            count(*) as total,
            count(*) FILTER (WHERE state = 'active') as active,
            count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity
        WHERE datname = 'cartoon'
    """)
    print(f"\n[2] 连接数: 总共={result['total']}, 活动={result['active']}, 空闲={result['idle']}")
    
    # 3. 数据库大小
    size = await conn.fetchval("SELECT pg_size_pretty(pg_database_size('cartoon'))")
    print(f"\n[3] 数据库大小: {size}")
    
    # 4. 慢查询配置
    slow_query_setting = await conn.fetchval("SHOW log_min_duration_statement")
    print(f"\n[4] 慢查询阈值: {slow_query_setting}")
    
    # 5. writing_prompt_templates 表大小
    table_info = await conn.fetchrow("""
        SELECT 
            pg_size_pretty(pg_total_relation_size('writing_prompt_templates')) as total_size,
            (SELECT count(*) FROM writing_prompt_templates) as row_count
    """)
    print(f"\n[5] writing_prompt_templates 表:")
    print(f"    行数: {table_info['row_count']}")
    print(f"    大小: {table_info['total_size']}")
    
    # 6. 检查是否有锁等待
    locks = await conn.fetch("""
        SELECT count(*) as cnt
        FROM pg_locks l
        JOIN pg_stat_activity a ON l.pid = a.pid
        WHERE NOT l.granted
    """)
    print(f"\n[6] 锁等待: {locks[0]['cnt']}")
    
    # 7. 共享缓冲区命中率
    hit_ratio = await conn.fetchrow("""
        SELECT 
            round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) as ratio
        FROM pg_stat_database
        WHERE datname = 'cartoon'
    """)
    print(f"\n[7] 缓存命中率: {hit_ratio['ratio']}%")
    
    # 8. 测试 EXPLAIN ANALYZE
    print("\n[8] 查询计划分析:")
    explain = await conn.fetch("""
        EXPLAIN ANALYZE 
        SELECT id, name, phase 
        FROM writing_prompt_templates 
        WHERE is_active = true AND phase IN ('creative', 'setting', 'framework', 'writing') AND genre IS NULL
        ORDER BY phase, sort_order
    """)
    for row in explain:
        print(f"    {row[0]}")
    
    await conn.close()
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(check())
