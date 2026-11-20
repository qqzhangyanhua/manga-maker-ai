-- 只查询，不写数据。在 20261128_chapter_panel_order.sql 之前运行。

SELECT
  (
    SELECT COUNT(*)::int
    FROM (
      SELECT ranked.chapter_id
      FROM (
        SELECT
          chapter_id,
          panel_order,
          (ROW_NUMBER() OVER (
            PARTITION BY chapter_id
            ORDER BY panel_order, created_at, id
          ))::int AS new_order
        FROM panels
      ) ranked
      WHERE ranked.panel_order IS DISTINCT FROM ranked.new_order
      GROUP BY ranked.chapter_id
    ) chapters_to_renumber
  ) AS "将被重编的章节数",
  (
    SELECT COUNT(*)::int
    FROM panels p
    WHERE p.character_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM panel_characters pc
        WHERE pc.panel_id = p.id
          AND pc.project_character_id IS NOT NULL
      )
  ) AS "将补在场角色的分镜数",
  (
    SELECT COUNT(*)::int
    FROM (
      SELECT DISTINCT p.project_id, p.character_id
      FROM panels p
      WHERE p.character_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM panel_characters pc
          WHERE pc.panel_id = p.id
            AND pc.project_character_id IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM project_characters prc
          WHERE prc.project_id = p.project_id
            AND prc.character_id = p.character_id
        )
    ) project_characters_to_add
  ) AS "将新增的项目角色数";
