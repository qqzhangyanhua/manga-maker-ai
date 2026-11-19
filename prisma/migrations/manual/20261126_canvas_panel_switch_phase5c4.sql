-- 阶段 5c-4：画布读写切换到分镜
-- 设计：docs/plans/2026-11-20-canvas-script-panel-merge-design.md
-- 前置：5c-1 至 5c-3c 迁移已执行
-- 幂等：可以重复执行。回滚：20261126_canvas_panel_switch_phase5c4_rollback.sql
--
-- 切换后画布直接读写 panels、panel_characters、panel_pipeline_states、panel_variants，
-- 不再写 shot_designs、comic_panel_results。5c-3 的镜头 -> 分镜触发器保留，只用于未归属项目的
-- 时间线锚定时把旧镜头导入为分镜。"画布分镜"指 segment_id 不为空的分镜。

BEGIN;

-- 1. 分镜角色可以是还没加入角色库的小说角色（待绑定），用画布的临时 ID（unbound-xxx）标识
ALTER TABLE panel_characters ALTER COLUMN project_character_id DROP NOT NULL;
ALTER TABLE panel_characters ADD COLUMN IF NOT EXISTS pending_character_key text;
ALTER TABLE panel_characters ADD COLUMN IF NOT EXISTS pending_character_name text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'panel_characters_reference_check') THEN
    ALTER TABLE panel_characters
      ADD CONSTRAINT panel_characters_reference_check
      CHECK ((project_character_id IS NULL) <> (pending_character_key IS NULL));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_panel_pending_character
  ON panel_characters (panel_id, pending_character_key)
  WHERE pending_character_key IS NOT NULL;

-- 2. 提示词合成、九宫格记录直接属于分镜，不再必须有镜头
ALTER TABLE shot_prompt_compositions ALTER COLUMN shot_design_id DROP NOT NULL;
ALTER TABLE nine_grid_generations ALTER COLUMN shot_design_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION canvas_fill_record_panel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- 只有旧镜头导入的记录按镜头填分镜；画布新写入的记录没有镜头，panel_id 由应用写入
  IF NEW.shot_design_id IS NOT NULL THEN
    NEW.panel_id := (
      SELECT sd.panel_id FROM shot_designs sd
      JOIN panels p ON p.id = sd.panel_id
      WHERE sd.id = NEW.shot_design_id
    );
  END IF;
  RETURN NEW;
END $$;

-- 3. 删除剧本片段时删除其画布分镜（与原来删除片段级联删除镜头、镜头删除分镜一致）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'panels_segment_id_fkey' AND confdeltype <> 'c'
  ) THEN
    ALTER TABLE panels DROP CONSTRAINT panels_segment_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'panels_segment_id_fkey') THEN
    ALTER TABLE panels
      ADD CONSTRAINT panels_segment_id_fkey
      FOREIGN KEY (segment_id) REFERENCES script_segments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. 章节内画布分镜统一编号：排在本章节非画布分镜之后，按时间线章节、剧本片段、旧镜头顺序、当前顺序
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

-- 5. 旧镜头导入：解除关联时分镜同时去掉 segment_id（作为普通分镜留在原项目），编号改用统一函数
CREATE OR REPLACE FUNCTION canvas_sync_shot_panel(p_shot_id uuid, p_reorder boolean, p_characters boolean)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  uuid_re CONSTANT text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  s shot_designs%ROWTYPE;
  v_chapter uuid;
  v_project uuid;
  v_user uuid;
  v_panel uuid;
  v_old_chapter uuid;
  v_pc uuid;
  v_outfit uuid;
  v_sort integer := 0;
  v_main_character uuid;
  v_main_outfit uuid;
  v_main_expression text;
  r record;
BEGIN
  SELECT * INTO s FROM shot_designs WHERE id = p_shot_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT seg.chapter_id INTO v_chapter FROM script_segments seg WHERE seg.id = s.script_segment_id;
  IF v_chapter IS NULL THEN
    IF s.panel_id IS NOT NULL THEN
      UPDATE panels SET segment_id = NULL WHERE id = s.panel_id;
      UPDATE shot_designs SET panel_id = NULL WHERE id = s.id;
    END IF;
    RETURN;
  END IF;

  SELECT c.project_id, p.user_id INTO v_project, v_user
  FROM chapters c JOIN projects p ON p.id = c.project_id
  WHERE c.id = v_chapter;

  PERFORM pg_advisory_xact_lock(hashtext('canvas_panels'), hashtext(v_chapter::text));

  SELECT id, chapter_id INTO v_panel, v_old_chapter FROM panels WHERE id = s.panel_id;

  IF v_panel IS NULL THEN
    INSERT INTO panels (
      project_id, chapter_id, panel_order, panel_type, importance, description,
      camera_angle, shot_size, visual_prompt, negative_prompt, composition_hint, location_key,
      generation_status, generated_image, scene_id, segment_id
    ) VALUES (
      v_project, v_chapter, 0, COALESCE(NULLIF(s.panel_type, ''), 'medium'), 'medium', s.shot_description,
      NULLIF(s.camera_angle, ''), NULLIF(s.shot_size, ''), s.prompt, s.negative_prompt,
      NULLIF(s.composition_hint, ''), NULLIF(s.location_key, ''),
      s.generation_status, s.generated_image_url,
      (SELECT sc.id FROM scenes sc WHERE sc.id = s.scene_id), s.script_segment_id
    )
    RETURNING id INTO v_panel;
    UPDATE shot_designs SET panel_id = v_panel WHERE id = s.id;
    p_reorder := true;
    p_characters := true;
  ELSE
    IF v_old_chapter IS DISTINCT FROM v_chapter THEN
      p_reorder := true;
      p_characters := true;
    END IF;
    UPDATE panels SET
      project_id = v_project,
      chapter_id = v_chapter,
      panel_type = COALESCE(NULLIF(s.panel_type, ''), 'medium'),
      description = s.shot_description,
      camera_angle = NULLIF(s.camera_angle, ''),
      shot_size = NULLIF(s.shot_size, ''),
      visual_prompt = s.prompt,
      negative_prompt = s.negative_prompt,
      composition_hint = NULLIF(s.composition_hint, ''),
      location_key = NULLIF(s.location_key, ''),
      generation_status = s.generation_status,
      generated_image = s.generated_image_url,
      scene_id = (SELECT sc.id FROM scenes sc WHERE sc.id = s.scene_id),
      segment_id = s.script_segment_id
    WHERE id = v_panel;
  END IF;

  IF p_characters THEN
    DELETE FROM panel_characters WHERE panel_id = v_panel;
    FOR r IN
      SELECT x.* FROM (
        SELECT DISTINCT ON (ch.id) ch.id AS character_id, t.ord,
               s.outfit_ids[t.ord] AS outfit_raw,
               NULLIF(s.expression_types[t.ord], '') AS expression
        FROM unnest(s.character_ids) WITH ORDINALITY AS t(cid, ord)
        JOIN characters ch
          ON ch.id = CASE WHEN t.cid ~ uuid_re THEN t.cid::uuid END
         AND ch.user_id = v_user
        ORDER BY ch.id, t.ord
      ) x
      ORDER BY x.ord
    LOOP
      INSERT INTO project_characters (project_id, character_id, role)
      VALUES (v_project, r.character_id, 'minor')
      ON CONFLICT (project_id, character_id) DO NOTHING;
      SELECT id INTO v_pc FROM project_characters
      WHERE project_id = v_project AND character_id = r.character_id;

      SELECT o.id INTO v_outfit FROM character_outfits o
      WHERE o.id = CASE WHEN r.outfit_raw ~ uuid_re THEN r.outfit_raw::uuid END
        AND o.character_id = r.character_id;

      INSERT INTO panel_characters (panel_id, project_character_id, outfit_id, expression_type, sort_order)
      VALUES (v_panel, v_pc, v_outfit, r.expression, v_sort);

      IF v_sort = 0 THEN
        v_main_character := r.character_id;
        v_main_outfit := v_outfit;
        v_main_expression := r.expression;
      END IF;
      v_sort := v_sort + 1;
    END LOOP;

    UPDATE panels SET
      character_id = v_main_character,
      outfit_id = v_main_outfit,
      expression_type = v_main_expression
    WHERE id = v_panel;
  END IF;

  IF p_reorder THEN
    PERFORM canvas_renumber_chapter_panels(v_chapter);
  END IF;
END $$;

-- 6. 剧本片段换章节：旧镜头照旧同步；画布直接创建的分镜（没有镜头）跟着片段移动，
--    片段不再属于项目章节时去掉 segment_id 留在原项目；换项目时角色改为新项目的项目角色
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

-- 7. 已解除关联、但还留着 segment_id 的旧分镜去掉 segment_id
UPDATE panels pa SET segment_id = NULL
FROM script_segments seg
WHERE seg.id = pa.segment_id
  AND seg.chapter_id IS DISTINCT FROM pa.chapter_id;

COMMIT;
