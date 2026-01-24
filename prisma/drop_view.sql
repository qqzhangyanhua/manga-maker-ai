-- 删除阻塞的数据库视图
-- 这个视图依赖 novel_chapters.cool_points 列，阻止了 schema 变更

DROP VIEW IF EXISTS v_chapter_search_metadata CASCADE;

-- 说明：
-- CASCADE 会自动删除所有依赖此视图的其他对象
-- 执行后可以继续 prisma db push
