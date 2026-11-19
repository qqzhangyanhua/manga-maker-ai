-- 回滚阶段 5c-4：恢复 5c-3a/5c-3b 的函数与约束。
-- 切换后画布写入的分镜没有镜头，回滚不会生成镜头；回滚数据库前应先回滚应用代码。
-- 待绑定角色行、没有镜头的合成/九宫格记录会被删除（否则无法恢复 NOT NULL）。

BEGIN;

DELETE FROM panel_characters WHERE project_character_id IS NULL;
DROP INDEX IF EXISTS unique_panel_pending_character;
ALTER TABLE panel_characters DROP CONSTRAINT IF EXISTS panel_characters_reference_check;
ALTER TABLE panel_characters DROP COLUMN IF EXISTS pending_character_name;
ALTER TABLE panel_characters DROP COLUMN IF EXISTS pending_character_key;
ALTER TABLE panel_characters ALTER COLUMN project_character_id SET NOT NULL;

UPDATE panel_pipeline_states st SET prompt_composition_id = NULL
FROM shot_prompt_compositions c WHERE c.id = st.prompt_composition_id AND c.shot_design_id IS NULL;
UPDATE panel_pipeline_states st SET nine_grid_generation_id = NULL
FROM nine_grid_generations n WHERE n.id = st.nine_grid_generation_id AND n.shot_design_id IS NULL;
DELETE FROM shot_prompt_compositions WHERE shot_design_id IS NULL;
DELETE FROM nine_grid_generations WHERE shot_design_id IS NULL;
ALTER TABLE shot_prompt_compositions ALTER COLUMN shot_design_id SET NOT NULL;
ALTER TABLE nine_grid_generations ALTER COLUMN shot_design_id SET NOT NULL;

CREATE OR REPLACE FUNCTION canvas_fill_record_panel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.panel_id := (
    SELECT sd.panel_id FROM shot_designs sd
    JOIN panels p ON p.id = sd.panel_id
    WHERE sd.id = NEW.shot_design_id
  );
  RETURN NEW;
END $$;

ALTER TABLE panels DROP CONSTRAINT IF EXISTS panels_segment_id_fkey;
ALTER TABLE panels
  ADD CONSTRAINT panels_segment_id_fkey
  FOREIGN KEY (segment_id) REFERENCES script_segments(id) ON DELETE SET NULL;

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
DROP FUNCTION IF EXISTS canvas_move_segment_panels(uuid, uuid);

-- canvas_sync_shot_panel 保留 5c-4 版本（解除关联时多清 segment_id，对 5c-3a 无影响），
-- 它调用的编号函数恢复为 5c-3a 的编号规则（只给有镜头的分镜编号）
CREATE OR REPLACE FUNCTION canvas_renumber_chapter_panels(p_chapter uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_chapter IS NULL THEN
    RETURN;
  END IF;
  UPDATE panels p SET panel_order = ranked.new_order
  FROM (
    SELECT pa.id,
           (SELECT COALESCE(MAX(o.panel_order), 0) FROM panels o
            WHERE o.chapter_id = p_chapter
              AND NOT EXISTS (SELECT 1 FROM shot_designs x WHERE x.panel_id = o.id))
           + ROW_NUMBER() OVER (
               ORDER BY tc.created_at, tc.id, seg.segment_order, sd.shot_order, sd.created_at, sd.id
             ) AS new_order
    FROM panels pa
    JOIN shot_designs sd ON sd.panel_id = pa.id
    JOIN script_segments seg ON seg.id = sd.script_segment_id
    JOIN timeline_chapters tc ON tc.id = seg.timeline_chapter_id
    WHERE pa.chapter_id = p_chapter
  ) ranked
  WHERE p.id = ranked.id AND p.panel_order IS DISTINCT FROM ranked.new_order;
END $$;

COMMIT;
