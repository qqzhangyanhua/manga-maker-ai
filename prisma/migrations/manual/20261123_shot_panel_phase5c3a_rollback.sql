-- 回滚阶段 5c-3a：删除镜头 -> 分镜同步。
-- 由画布镜头物化出的分镜会被删除（包括在项目里对这些分镜做的修改）；画布镜头本身保留。

BEGIN;

DROP TRIGGER IF EXISTS trg_canvas_segment_panel ON script_segments;
DROP FUNCTION IF EXISTS canvas_segment_panel_trigger();
DROP TRIGGER IF EXISTS trg_canvas_panel_delete ON panels;
DROP FUNCTION IF EXISTS canvas_panel_delete_trigger();
DROP TRIGGER IF EXISTS trg_canvas_shot_panel_delete ON shot_designs;
DROP TRIGGER IF EXISTS trg_canvas_shot_panel_write ON shot_designs;
DROP FUNCTION IF EXISTS canvas_shot_panel_trigger();
DROP FUNCTION IF EXISTS canvas_sync_shot_panel(uuid, boolean, boolean);

-- 触发器已删除，这里删分镜不会连带删除画布镜头
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shot_designs' AND column_name = 'panel_id') THEN
    DELETE FROM panels WHERE id IN (SELECT panel_id FROM shot_designs WHERE panel_id IS NOT NULL);
  END IF;
END $$;

DROP INDEX IF EXISTS unique_shot_designs_panel;
ALTER TABLE shot_designs DROP COLUMN IF EXISTS panel_id;

DROP TABLE IF EXISTS panel_characters;

DROP INDEX IF EXISTS idx_panels_segment;
ALTER TABLE panels DROP CONSTRAINT IF EXISTS panels_segment_id_fkey;
ALTER TABLE panels DROP COLUMN IF EXISTS segment_id;
ALTER TABLE panels DROP COLUMN IF EXISTS composition_hint;
ALTER TABLE panels DROP COLUMN IF EXISTS location_key;
ALTER TABLE panels DROP COLUMN IF EXISTS negative_prompt;
ALTER TABLE panels DROP COLUMN IF EXISTS generation_status;

COMMIT;
