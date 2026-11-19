-- 阶段 5c-3c：画布最终漫画结果同步为分镜候选图
-- 设计：docs/plans/2026-11-20-canvas-script-panel-merge-design.md
-- 前置：20261123_shot_panel_phase5c3a.sql 已执行
-- 幂等：可以重复执行。回滚：20261125_comic_result_variant_phase5c3c_rollback.sql
--
-- 每条已完成且有图的 comic_panel_results 对应一条 panel_variants（variant_type = 'canvas_final'），
-- 放在镜头当前的分镜下。过渡期由触发器从画布侧单向同步，应用代码不写新列。
-- 同步来的候选图不自动选中：分镜主图仍由镜头的 generated_image_url 同步（5c-3a），选中由用户在项目侧决定。

BEGIN;

-- 1. 候选图新增生成参数与来源结果
ALTER TABLE panel_variants ADD COLUMN IF NOT EXISTS generation_params jsonb NOT NULL DEFAULT '{}';
ALTER TABLE panel_variants ADD COLUMN IF NOT EXISTS comic_panel_result_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'panel_variants_comic_panel_result_id_fkey') THEN
    ALTER TABLE panel_variants
      ADD CONSTRAINT panel_variants_comic_panel_result_id_fkey
      FOREIGN KEY (comic_panel_result_id) REFERENCES comic_panel_results(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_panel_variants_comic_panel_result ON panel_variants (comic_panel_result_id);

-- 2. 把一条结果同步为它镜头当前分镜下的候选图
CREATE OR REPLACE FUNCTION canvas_sync_result_variant(p_result_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  r comic_panel_results%ROWTYPE;
  v_shot_panel uuid;
  v_panel uuid;
BEGIN
  SELECT * INTO r FROM comic_panel_results WHERE id = p_result_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 先单独锁镜头行再查分镜：与镜头换分镜互斥。若和分镜一起 JOIN 加锁，
  -- 并发事务新建的分镜不可见，查不到行也就不会等待，候选图会漏同步。
  SELECT panel_id INTO v_shot_panel FROM shot_designs WHERE id = r.shot_design_id FOR SHARE;
  SELECT id INTO v_panel FROM panels WHERE id = v_shot_panel;

  IF v_panel IS NULL OR r.status <> 'completed' OR r.image_url = '' THEN
    DELETE FROM panel_variants WHERE comic_panel_result_id = r.id;
    RETURN;
  END IF;

  INSERT INTO panel_variants (
    panel_id, image_url, prompt, variant_type, is_selected, created_at, generation_params, comic_panel_result_id
  ) VALUES (
    v_panel, r.image_url, r.generation_prompt, 'canvas_final', false, r.created_at,
    COALESCE(CASE WHEN jsonb_typeof(r.generation_params) = 'object' THEN r.generation_params END, '{}'::jsonb)
      || jsonb_build_object(
        'width', r.width,
        'height', r.height,
        'character_reference_images', to_jsonb(r.character_reference_images),
        'controlnet_type', r.controlnet_type,
        'controlnet_weight', r.controlnet_weight,
        'model_used', r.model_used,
        'lora_models', to_jsonb(r.lora_models)
      ),
    r.id
  )
  ON CONFLICT (comic_panel_result_id) DO UPDATE SET
    is_selected = CASE WHEN panel_variants.panel_id = EXCLUDED.panel_id THEN panel_variants.is_selected ELSE false END,
    panel_id = EXCLUDED.panel_id,
    image_url = EXCLUDED.image_url,
    prompt = EXCLUDED.prompt,
    generation_params = EXCLUDED.generation_params;
END $$;

CREATE OR REPLACE FUNCTION canvas_result_variant_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM canvas_sync_result_variant(NEW.id);
  RETURN NULL;
END $$;

-- 结果删除由外键级联删除候选图
DROP TRIGGER IF EXISTS trg_canvas_result_variant ON comic_panel_results;
CREATE TRIGGER trg_canvas_result_variant
  AFTER INSERT OR UPDATE OF shot_design_id, image_url, generation_prompt, status, width, height,
    character_reference_images, controlnet_type, controlnet_weight, model_used, lora_models, generation_params
  ON comic_panel_results
  FOR EACH ROW EXECUTE FUNCTION canvas_result_variant_trigger();

-- 3. 镜头换分镜：原分镜上的候选图留作普通候选图（与解除关联后原分镜作为普通分镜保留一致），
--    再在新分镜下重建
CREATE OR REPLACE FUNCTION canvas_shot_variants_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_result uuid;
BEGIN
  IF OLD.panel_id IS NOT NULL THEN
    UPDATE panel_variants v SET comic_panel_result_id = NULL
    FROM comic_panel_results r
    WHERE v.comic_panel_result_id = r.id
      AND r.shot_design_id = NEW.id
      AND v.panel_id = OLD.panel_id;
  END IF;
  FOR v_result IN
    SELECT id FROM comic_panel_results WHERE shot_design_id = NEW.id ORDER BY created_at, id
  LOOP
    PERFORM canvas_sync_result_variant(v_result);
  END LOOP;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_canvas_shot_variants ON shot_designs;
CREATE TRIGGER trg_canvas_shot_variants
  AFTER UPDATE OF panel_id ON shot_designs
  FOR EACH ROW
  WHEN (OLD.panel_id IS DISTINCT FROM NEW.panel_id)
  EXECUTE FUNCTION canvas_shot_variants_trigger();

-- 4. 回填
DO $$
DECLARE
  v_result uuid;
BEGIN
  FOR v_result IN SELECT id FROM comic_panel_results ORDER BY created_at, id LOOP
    PERFORM canvas_sync_result_variant(v_result);
  END LOOP;
END $$;

COMMIT;
