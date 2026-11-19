-- 回滚阶段 5c-3c：删除同步来的画布成图候选图与新增列（画布侧数据不受影响）

BEGIN;

DROP TRIGGER IF EXISTS trg_canvas_shot_variants ON shot_designs;
DROP FUNCTION IF EXISTS canvas_shot_variants_trigger();
DROP TRIGGER IF EXISTS trg_canvas_result_variant ON comic_panel_results;
DROP FUNCTION IF EXISTS canvas_result_variant_trigger();
DROP FUNCTION IF EXISTS canvas_sync_result_variant(uuid);

-- 包括镜头换分镜后留在原分镜上的普通候选图，它们都来自本阶段的同步
DELETE FROM panel_variants WHERE variant_type = 'canvas_final';

DROP INDEX IF EXISTS unique_panel_variants_comic_panel_result;
ALTER TABLE panel_variants DROP CONSTRAINT IF EXISTS panel_variants_comic_panel_result_id_fkey;
ALTER TABLE panel_variants DROP COLUMN IF EXISTS comic_panel_result_id;
ALTER TABLE panel_variants DROP COLUMN IF EXISTS generation_params;

COMMIT;
