-- 只查询，不写数据。在 20261129_chapter_panel_constraints.sql 之前运行。
-- 远端执行约束迁移前，人要确认这里没有行。有重复编号时不要加约束。

SELECT chapter_id, panel_order, COUNT(*) AS copies
FROM panels
GROUP BY chapter_id, panel_order
HAVING COUNT(*) > 1
ORDER BY copies DESC, chapter_id, panel_order;
