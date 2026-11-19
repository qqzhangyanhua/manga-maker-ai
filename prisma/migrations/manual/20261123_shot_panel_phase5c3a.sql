-- 阶段 5c-3a：画布镜头设计物化为项目分镜
-- 设计：docs/plans/2026-11-20-canvas-script-panel-merge-design.md
-- 前置：20261122_script_segment_chapter_phase5c2.sql 已执行
-- 幂等：可以重复执行。回滚：20261123_shot_panel_phase5c3a_rollback.sql
--
-- 过渡期画布是镜头数据的写入方，镜头所属剧本片段挂到项目章节后（5c-2 的 chapter_id），
-- 触发器把镜头同步为该章节下的分镜：新增、修改、删除、剧本片段换章节都跟随，调用方不用改。
-- 同步是单向的：画布再次修改镜头时会覆盖分镜上的对应字段；5c-4 读切换后分镜成为唯一数据源。
-- 在项目里直接删除分镜时，对应的画布镜头一并删除（两边是同一份分镜）；
-- 项目或章节被删除连带删除分镜时，只解除关联，画布镜头保留。

BEGIN;

-- 1. 分镜补齐画布字段。panels.script_segment_id 仍是剧本编辑器 JSON 片段的 ID（如 seg_1），
--    不能改成外键，所以另加 segment_id 指向 script_segments。
ALTER TABLE panels ADD COLUMN IF NOT EXISTS segment_id uuid;
ALTER TABLE panels ADD COLUMN IF NOT EXISTS composition_hint text;
ALTER TABLE panels ADD COLUMN IF NOT EXISTS location_key text;
ALTER TABLE panels ADD COLUMN IF NOT EXISTS negative_prompt text;
ALTER TABLE panels ADD COLUMN IF NOT EXISTS generation_status text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'panels_segment_id_fkey') THEN
    ALTER TABLE panels
      ADD CONSTRAINT panels_segment_id_fkey
      FOREIGN KEY (segment_id) REFERENCES script_segments(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_panels_segment ON panels (segment_id);

-- 2. 分镜多角色。panels.character_id 保留为主角色（第一个角色）兼容字段。
CREATE TABLE IF NOT EXISTS panel_characters (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id             uuid NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  project_character_id uuid NOT NULL REFERENCES project_characters(id) ON DELETE CASCADE,
  outfit_id            uuid REFERENCES character_outfits(id) ON DELETE SET NULL,
  expression_type      text,
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT unique_panel_character UNIQUE (panel_id, project_character_id)
);

CREATE INDEX IF NOT EXISTS idx_panel_characters_project_character
  ON panel_characters (project_character_id);

-- 3. 镜头 -> 分镜。不建外键：删除分镜时要区分"直接删除"和"随项目/章节级联删除"，
--    外键的 SET NULL 会在触发器之前清掉关联，所以由第 6 节的触发器维护。
ALTER TABLE shot_designs ADD COLUMN IF NOT EXISTS panel_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS unique_shot_designs_panel ON shot_designs (panel_id);

-- 4. 同步一个镜头到分镜
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
    -- 剧本片段不再属于项目章节：只解除关联，已有分镜作为普通分镜留在原项目
    IF s.panel_id IS NOT NULL THEN
      UPDATE shot_designs SET panel_id = NULL WHERE id = s.id;
    END IF;
    RETURN;
  END IF;

  SELECT c.project_id, p.user_id INTO v_project, v_user
  FROM chapters c JOIN projects p ON p.id = c.project_id
  WHERE c.id = v_chapter;

  -- 同一章节的分镜编号串行进行，否则并行写入的镜头会算出重复的顺序
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
    -- character_ids 里可能有未绑定角色的临时 ID（unbound-xxx），只同步属于项目所有者角色库的角色
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
    -- 画布分镜排在本章节原有分镜之后，按时间线章节、剧本片段、镜头顺序编号
    UPDATE panels p SET panel_order = ranked.new_order
    FROM (
      SELECT pa.id,
             (SELECT COALESCE(MAX(o.panel_order), 0) FROM panels o
              WHERE o.chapter_id = v_chapter
                AND NOT EXISTS (SELECT 1 FROM shot_designs x WHERE x.panel_id = o.id))
             + ROW_NUMBER() OVER (
                 ORDER BY tc.created_at, tc.id, seg.segment_order, sd.shot_order, sd.created_at, sd.id
               ) AS new_order
      FROM panels pa
      JOIN shot_designs sd ON sd.panel_id = pa.id
      JOIN script_segments seg ON seg.id = sd.script_segment_id
      JOIN timeline_chapters tc ON tc.id = seg.timeline_chapter_id
      WHERE pa.chapter_id = v_chapter
    ) ranked
    WHERE p.id = ranked.id AND p.panel_order IS DISTINCT FROM ranked.new_order;
  END IF;
END $$;

-- 5. 镜头写入、删除
CREATE OR REPLACE FUNCTION canvas_shot_panel_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.panel_id IS NOT NULL THEN
      DELETE FROM panels WHERE id = OLD.panel_id;
    END IF;
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM canvas_sync_shot_panel(NEW.id, true, true);
  ELSE
    PERFORM canvas_sync_shot_panel(
      NEW.id,
      OLD.shot_order IS DISTINCT FROM NEW.shot_order
        OR OLD.script_segment_id IS DISTINCT FROM NEW.script_segment_id,
      OLD.character_ids IS DISTINCT FROM NEW.character_ids
        OR OLD.outfit_ids IS DISTINCT FROM NEW.outfit_ids
        OR OLD.expression_types IS DISTINCT FROM NEW.expression_types
        OR OLD.script_segment_id IS DISTINCT FROM NEW.script_segment_id
    );
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_canvas_shot_panel_write ON shot_designs;
-- 列清单不含 panel_id 和画布流程状态字段：同步函数自己回写 panel_id 不会再次触发
CREATE TRIGGER trg_canvas_shot_panel_write
  AFTER INSERT OR UPDATE OF
    script_segment_id, shot_order, camera_angle, shot_size, panel_type, shot_description,
    composition_hint, location_key, character_ids, scene_id, expression_types, outfit_ids,
    prompt, negative_prompt, generated_image_url, generation_status
  ON shot_designs
  FOR EACH ROW EXECUTE FUNCTION canvas_shot_panel_trigger();

DROP TRIGGER IF EXISTS trg_canvas_shot_panel_delete ON shot_designs;
CREATE TRIGGER trg_canvas_shot_panel_delete
  AFTER DELETE ON shot_designs
  FOR EACH ROW EXECUTE FUNCTION canvas_shot_panel_trigger();

-- 6. 分镜删除：直接删除时连带删除画布镜头；项目或章节已删除（级联）时只解除关联
CREATE OR REPLACE FUNCTION canvas_panel_delete_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id)
     AND EXISTS (SELECT 1 FROM chapters WHERE id = OLD.chapter_id) THEN
    DELETE FROM shot_designs WHERE panel_id = OLD.id;
  ELSE
    UPDATE shot_designs SET panel_id = NULL WHERE panel_id = OLD.id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_canvas_panel_delete ON panels;
CREATE TRIGGER trg_canvas_panel_delete
  AFTER DELETE ON panels
  FOR EACH ROW EXECUTE FUNCTION canvas_panel_delete_trigger();

-- 7. 剧本片段换章节（时间线锚定、改归属、项目章节被删除置空）或调整顺序时，重新同步其镜头
CREATE OR REPLACE FUNCTION canvas_segment_panel_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_moved boolean := OLD.chapter_id IS DISTINCT FROM NEW.chapter_id;
  v_shot uuid;
BEGIN
  FOR v_shot IN SELECT id FROM shot_designs WHERE script_segment_id = NEW.id ORDER BY shot_order, created_at, id LOOP
    PERFORM canvas_sync_shot_panel(v_shot, true, v_moved);
  END LOOP;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_canvas_segment_panel ON script_segments;
CREATE TRIGGER trg_canvas_segment_panel
  AFTER UPDATE OF chapter_id, segment_order ON script_segments
  FOR EACH ROW
  WHEN (OLD.chapter_id IS DISTINCT FROM NEW.chapter_id OR OLD.segment_order IS DISTINCT FROM NEW.segment_order)
  EXECUTE FUNCTION canvas_segment_panel_trigger();

-- 8. 回填：剧本片段已挂到项目章节、但还没有分镜的镜头
DO $$
DECLARE
  v_shot uuid;
BEGIN
  FOR v_shot IN
    SELECT sd.id FROM shot_designs sd
    JOIN script_segments seg ON seg.id = sd.script_segment_id
    WHERE seg.chapter_id IS NOT NULL
      AND (sd.panel_id IS NULL OR NOT EXISTS (SELECT 1 FROM panels p WHERE p.id = sd.panel_id))
    ORDER BY seg.chapter_id, seg.segment_order, sd.shot_order, sd.created_at
  LOOP
    PERFORM canvas_sync_shot_panel(v_shot, true, true);
  END LOOP;
END $$;

COMMIT;
