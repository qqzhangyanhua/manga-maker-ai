-- 章节内重编号，并让主角色跟随第一位在场角色。
-- 预览：20261128_chapter_panel_order_dry_run.sql
-- 回滚：20261128_chapter_panel_order_rollback.sql（不撤回已改的编号和在场角色）
-- 幂等：可以重复执行。

BEGIN;

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
           (ROW_NUMBER() OVER (
             ORDER BY pa.panel_order, pa.created_at, pa.id
           ))::int AS new_order
    FROM panels pa
    WHERE pa.chapter_id = p_chapter
  ) ranked
  WHERE p.id = ranked.id AND p.panel_order IS DISTINCT FROM ranked.new_order;
END $$;

-- 不移动镜头分镜。直接调用时，只重编仍挂在片段上的非镜头分镜的原章节。
CREATE OR REPLACE FUNCTION canvas_move_segment_panels(p_segment uuid, p_chapter uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_project uuid;
  v_user uuid;
  v_panel record;
  v_pc record;
  v_new_pc uuid;
  v_old_chapters uuid[];
  v_old_chapter uuid;
BEGIN
  IF p_chapter IS NULL THEN
    UPDATE panels pa SET segment_id = NULL
    WHERE pa.segment_id = p_segment
      AND NOT EXISTS (SELECT 1 FROM shot_designs sd WHERE sd.panel_id = pa.id);
    RETURN;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT pa.chapter_id), ARRAY[]::uuid[])
  INTO v_old_chapters
  FROM panels pa
  WHERE pa.segment_id = p_segment
    AND NOT EXISTS (SELECT 1 FROM shot_designs sd WHERE sd.panel_id = pa.id)
    AND pa.chapter_id IS DISTINCT FROM p_chapter;

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

  FOREACH v_old_chapter IN ARRAY v_old_chapters LOOP
    PERFORM canvas_renumber_chapter_panels(v_old_chapter);
  END LOOP;
  PERFORM canvas_renumber_chapter_panels(p_chapter);
END $$;

-- 待绑定行不是在场角色。
CREATE OR REPLACE FUNCTION panel_characters_sync_lead() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_panel uuid;
  v_panels uuid[];
  v_character uuid;
  v_outfit uuid;
  v_expression text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_panels := ARRAY[OLD.panel_id];
  ELSE
    v_panels := ARRAY[NEW.panel_id];
    IF TG_OP = 'UPDATE' AND OLD.panel_id IS DISTINCT FROM NEW.panel_id THEN
      v_panels := v_panels || OLD.panel_id;
    END IF;
  END IF;

  FOREACH v_panel IN ARRAY v_panels LOOP
    SELECT prc.character_id, pc.outfit_id, pc.expression_type
      INTO v_character, v_outfit, v_expression
    FROM panel_characters pc
    JOIN project_characters prc ON prc.id = pc.project_character_id
    WHERE pc.panel_id = v_panel
      AND pc.project_character_id IS NOT NULL
    ORDER BY pc.sort_order, pc.created_at, pc.id
    LIMIT 1;

    UPDATE panels SET
      character_id = v_character,
      outfit_id = v_outfit,
      expression_type = v_expression
    WHERE id = v_panel
      AND (
        character_id IS DISTINCT FROM v_character
        OR outfit_id IS DISTINCT FROM v_outfit
        OR expression_type IS DISTINCT FROM v_expression
      );
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_panel_characters_sync_lead ON panel_characters;
CREATE TRIGGER trg_panel_characters_sync_lead
  AFTER INSERT OR UPDATE OR DELETE ON panel_characters
  FOR EACH ROW EXECUTE FUNCTION panel_characters_sync_lead();

-- 镜头同步会先把分镜改到新章节，移出的章节要在同步前记下。空章节只清 segment_id，不重编。
CREATE OR REPLACE FUNCTION canvas_segment_panel_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_moved boolean := OLD.chapter_id IS DISTINCT FROM NEW.chapter_id;
  v_shot uuid;
  v_left_chapters uuid[];
  v_left_chapter uuid;
BEGIN
  IF v_moved AND NEW.chapter_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(DISTINCT pa.chapter_id), ARRAY[]::uuid[])
    INTO v_left_chapters
    FROM panels pa
    WHERE pa.segment_id = NEW.id
      AND pa.chapter_id IS DISTINCT FROM NEW.chapter_id;
  END IF;

  FOR v_shot IN SELECT id FROM shot_designs WHERE script_segment_id = NEW.id ORDER BY shot_order, created_at, id LOOP
    PERFORM canvas_sync_shot_panel(v_shot, true, v_moved);
  END LOOP;
  IF v_moved THEN
    PERFORM canvas_move_segment_panels(NEW.id, NEW.chapter_id);
  END IF;
  IF v_moved AND NEW.chapter_id IS NOT NULL THEN
    FOREACH v_left_chapter IN ARRAY v_left_chapters LOOP
      PERFORM canvas_renumber_chapter_panels(v_left_chapter);
    END LOOP;
  END IF;
  PERFORM canvas_renumber_chapter_panels(NEW.chapter_id);
  RETURN NULL;
END $$;

-- 只有待绑定行也算没有在场角色。已有项目角色不改定位。
INSERT INTO project_characters (project_id, character_id, role)
SELECT DISTINCT p.project_id, p.character_id, 'minor'
FROM panels p
WHERE p.character_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM panel_characters pc
    WHERE pc.panel_id = p.id
      AND pc.project_character_id IS NOT NULL
  )
ON CONFLICT (project_id, character_id) DO NOTHING;

INSERT INTO panel_characters (panel_id, project_character_id, outfit_id, expression_type, sort_order)
SELECT p.id, prc.id, p.outfit_id, p.expression_type, 0
FROM panels p
JOIN project_characters prc
  ON prc.project_id = p.project_id
 AND prc.character_id = p.character_id
WHERE p.character_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM panel_characters pc
    WHERE pc.panel_id = p.id
      AND pc.project_character_id IS NOT NULL
  );

DO $$
DECLARE
  v_chapter uuid;
BEGIN
  FOR v_chapter IN SELECT id FROM chapters ORDER BY id LOOP
    PERFORM canvas_renumber_chapter_panels(v_chapter);
  END LOOP;
END $$;

COMMIT;
