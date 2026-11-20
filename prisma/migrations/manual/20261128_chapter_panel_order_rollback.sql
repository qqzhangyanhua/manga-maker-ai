-- 回滚 20261128_chapter_panel_order.sql。
-- 去掉主角色触发器，并把 canvas_renumber_chapter_panels、canvas_move_segment_panels、canvas_segment_panel_trigger 恢复成 5c-4。
-- 不撤回已经重编的编号，也不删除补上的在场角色和项目角色。

BEGIN;

DROP TRIGGER IF EXISTS trg_panel_characters_sync_lead ON panel_characters;
DROP FUNCTION IF EXISTS panel_characters_sync_lead();

CREATE OR REPLACE FUNCTION canvas_renumber_chapter_panels(p_chapter uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_chapter IS NULL THEN
    RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('canvas_panels'), hashtext(p_chapter::text));
  UPDATE panels p SET panel_order = ranked.new_order
  FROM (
    SELECT pa.id,
           (SELECT COALESCE(MAX(o.panel_order), 0) FROM panels o
            WHERE o.chapter_id = p_chapter AND o.segment_id IS NULL)
           + ROW_NUMBER() OVER (
               ORDER BY tc.created_at, tc.id, seg.segment_order, sd.shot_order NULLS LAST,
                        pa.panel_order, pa.created_at, pa.id
             ) AS new_order
    FROM panels pa
    JOIN script_segments seg ON seg.id = pa.segment_id
    JOIN timeline_chapters tc ON tc.id = seg.timeline_chapter_id
    LEFT JOIN shot_designs sd ON sd.panel_id = pa.id
    WHERE pa.chapter_id = p_chapter
  ) ranked
  WHERE p.id = ranked.id AND p.panel_order IS DISTINCT FROM ranked.new_order;
END $$;

CREATE OR REPLACE FUNCTION canvas_move_segment_panels(p_segment uuid, p_chapter uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_project uuid;
  v_user uuid;
  v_panel record;
  v_pc record;
  v_new_pc uuid;
BEGIN
  IF p_chapter IS NULL THEN
    UPDATE panels pa SET segment_id = NULL
    WHERE pa.segment_id = p_segment
      AND NOT EXISTS (SELECT 1 FROM shot_designs sd WHERE sd.panel_id = pa.id);
    RETURN;
  END IF;

  SELECT c.project_id, p.user_id INTO v_project, v_user
  FROM chapters c JOIN projects p ON p.id = c.project_id
  WHERE c.id = p_chapter;

  FOR v_panel IN
    SELECT pa.id, pa.project_id FROM panels pa
    WHERE pa.segment_id = p_segment
      AND NOT EXISTS (SELECT 1 FROM shot_designs sd WHERE sd.panel_id = pa.id)
  LOOP
    IF v_panel.project_id IS DISTINCT FROM v_project THEN
      FOR v_pc IN
        SELECT pc.id, prc.character_id
        FROM panel_characters pc
        JOIN project_characters prc ON prc.id = pc.project_character_id
        WHERE pc.panel_id = v_panel.id
      LOOP
        IF EXISTS (SELECT 1 FROM characters ch WHERE ch.id = v_pc.character_id AND ch.user_id = v_user) THEN
          INSERT INTO project_characters (project_id, character_id, role)
          VALUES (v_project, v_pc.character_id, 'minor')
          ON CONFLICT (project_id, character_id) DO NOTHING;
          SELECT id INTO v_new_pc FROM project_characters
          WHERE project_id = v_project AND character_id = v_pc.character_id;
          UPDATE panel_characters SET project_character_id = v_new_pc WHERE id = v_pc.id;
        ELSE
          DELETE FROM panel_characters WHERE id = v_pc.id;
        END IF;
      END LOOP;
    END IF;
    UPDATE panels SET project_id = v_project, chapter_id = p_chapter WHERE id = v_panel.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION canvas_segment_panel_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_moved boolean := OLD.chapter_id IS DISTINCT FROM NEW.chapter_id;
  v_shot uuid;
BEGIN
  FOR v_shot IN SELECT id FROM shot_designs WHERE script_segment_id = NEW.id ORDER BY shot_order, created_at, id LOOP
    PERFORM canvas_sync_shot_panel(v_shot, true, v_moved);
  END LOOP;
  IF v_moved THEN
    PERFORM canvas_move_segment_panels(NEW.id, NEW.chapter_id);
  END IF;
  PERFORM canvas_renumber_chapter_panels(NEW.chapter_id);
  RETURN NULL;
END $$;

COMMIT;
