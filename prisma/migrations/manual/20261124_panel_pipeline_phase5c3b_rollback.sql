-- 回滚阶段 5c-3b：删除分镜流程状态表与合成、九宫格记录的 panel_id（画布侧数据不受影响）

BEGIN;

DROP TRIGGER IF EXISTS trg_canvas_fill_nine_grid_panel ON nine_grid_generations;
DROP TRIGGER IF EXISTS trg_canvas_fill_composition_panel ON shot_prompt_compositions;
DROP FUNCTION IF EXISTS canvas_fill_record_panel();
DROP TRIGGER IF EXISTS trg_canvas_shot_pipeline ON shot_designs;
DROP FUNCTION IF EXISTS canvas_shot_pipeline_trigger();
DROP FUNCTION IF EXISTS canvas_sync_shot_pipeline(uuid);

DROP INDEX IF EXISTS idx_nine_grid_generations_panel;
DROP INDEX IF EXISTS unique_shot_prompt_compositions_panel;
ALTER TABLE nine_grid_generations DROP CONSTRAINT IF EXISTS nine_grid_generations_panel_id_fkey;
ALTER TABLE shot_prompt_compositions DROP CONSTRAINT IF EXISTS shot_prompt_compositions_panel_id_fkey;
ALTER TABLE nine_grid_generations DROP COLUMN IF EXISTS panel_id;
ALTER TABLE shot_prompt_compositions DROP COLUMN IF EXISTS panel_id;

DROP TABLE IF EXISTS panel_pipeline_states;

COMMIT;
