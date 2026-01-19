#!/usr/bin/env python3
"""
简单脚本：查询数据库中是否有章节数据
"""
import asyncio
import asyncpg

# 从后端日志中看到的数据库连接信息
DATABASE_URL = "postgresql://postgres:zhangyanhua123@111.228.37.74:5432/cartoon"

async def check_chapters():
    try:
        conn = await asyncpg.connect(DATABASE_URL)

        project_id = '19332382-ee75-4e08-9ec0-a7834063432c'

        # 查询章节数量
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM novel_chapters WHERE project_id = $1",
            project_id
        )
        print(f"✅ 项目 {project_id} 有 {count} 个章节")

        if count > 0:
            # 查询章节详情
            rows = await conn.fetch("""
                SELECT chapter_number, title, status, word_count,
                       LENGTH(content) as content_len,
                       LENGTH(outline) as outline_len
                FROM novel_chapters
                WHERE project_id = $1
                ORDER BY chapter_number
                LIMIT 5
            """, project_id)

            print("\n前5个章节:")
            for row in rows:
                print(f"  第 {row['chapter_number']} 章: {row['title']}")
                print(f"    状态: {row['status']}, 字数: {row['word_count']}")
                print(f"    正文长度: {row['content_len'] or 0}, 大纲长度: {row['outline_len'] or 0}")
        else:
            print("\n❌ 数据库中没有章节数据！")
            print("   这就是为什么前端显示'暂无已完成的章节'")

        await conn.close()

    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_chapters())
