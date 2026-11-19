-- 阶段 5c-3b：画布流程状态挂到分镜，九宫格与提示词合成记录关联分镜
-- 设计：docs/plans/2026-11-20-canvas-script-panel-merge-design.md
-- 前置：20261123_shot_panel_phase5c3a.sql 已执行
-- 幂等：可以重复执行。回滚：20261124_panel_pipeline_phase5c3b_rollback.sql
--
-- 画布流程状态（角色提示词、最终提示词、九宫格、选图）不进 panels，放附属表 panel_pipeline_states。
-- 与 5c-3a 相同，过渡期由触发器从 shot_designs 单向同步，应用代码不写这些新表和新列。

BEGIN;

-- 1. 分镜流程状态（只有画布来的分镜有）
CREATE TABLE IF NOT EXISTS panel_pipeline_states (
  panel_id                      uuid PRIMARY KEY REFERENCES panels(id) ON DELETE CASCADE,
  character_prompt_template_ids uuid[] NOT NULL DEFAULT '{}',
  prompt_composition_id         uuid REFERENCES shot_prompt_compositions(id) ON DELETE SET NULL,
  nine_grid_generation_id       uuid REFERENCES nine_grid_generations(id) ON DELETE SET NULL,
  character_prompt_status       text NOT NULL DEFAULT 'pending',
  final_prompt_status           text NOT NULL DEFAULT 'pending',
  nine_grid_status              text NOT NULL DEFAULT 'pending',
  selection_status              text NOT NULL DEFAULT 'pending',
  updated_at                    timestamptz(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panel_pipeline_composition ON panel_pipeline_states (prompt_composition_id);
CREATE INDEX IF NOT EXISTS idx_panel_pipeline_nine_grid ON panel_pipeline_states (nine_grid_generation_id);

-- 2. 提示词合成（每个镜头一条）、九宫格生成记录（每个镜头可多条）关联分镜
ALTER TABLE shot_prompt_compositions ADD COLUMN IF NOT EXISTS panel_id uuid;
ALTER TABLE nine_grid_generations ADD COLUMN IF NOT EXISTS panel_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shot_prompt_compositions_panel_id_fkey') THEN
    ALTER TABLE shot_prompt_compositions
      ADD CONSTRAINT shot_prompt_compositions_panel_id_fkey
      FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nine_grid_generations_panel_id_fkey') THEN
    ALTER TABLE nine_grid_generations
      ADD CONSTRAINT nine_grid_generations_panel_id_fkey
      FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_shot_prompt_compositions_panel ON shot_prompt_compositions (panel_id);
CREATE INDEX IF NOT EXISTS idx_nine_grid_generations_panel ON nine_grid_generations (panel_id);

-- 3. 把镜头的流程状态写到它的分镜
CREATE OR REPLACE FUNCTION canvas_sync_shot_pipeline(p_shot_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  s shot_designs%ROWTYPE;
BEGIN
  SELECT * INTO s FROM shot_designs WHERE id = p_shot_id;
  IF NOT FOUND OR s.panel_id IS NULL OR NOT EXISTS (SELECT 1 FROM panels WHERE id = s.panel_id) THEN
    RETURN;
  END IF;

  INSERT INTO panel_pipeline_states (
    panel_id, character_prompt_template_ids, prompt_composition_id, nine_grid_generation_id,
    character_prompt_status, final_prompt_status, nine_grid_status, selection_status
  ) VALUES (
    s.panel_id, s.character_prompt_template_ids, s.prompt_composition_id, s.nine_grid_generation_id,
    s.character_prompt_status, s.final_prompt_status, s.nine_grid_status, s.selection_status
  )
  ON CONFLICT (panel_id) DO UPDATE SET
    character_prompt_template_ids = EXCLUDED.character_prompt_template_ids,
    prompt_composition_id = EXCLUDED.prompt_composition_id,
    nine_grid_generation_id = EXCLUDED.nine_grid_generation_id,
    character_prompt_status = EXCLUDED.character_prompt_status,
    final_prompt_status = EXCLUDED.final_prompt_status,
    nine_grid_status = EXCLUDED.nine_grid_status,
    selection_status = EXCLUDED.selection_status,
    updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION canvas_shot_pipeline_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.panel_id IS DISTINCT FROM NEW.panel_id THEN
    -- 关联变化（新建分镜、解除关联、重建）：旧分镜的流程状态作废，合成与九宫格记录改指向新分镜
    IF OLD.panel_id IS NOT NULL THEN
      DELETE FROM panel_pipeline_states WHERE panel_id = OLD.panel_id;
    END IF;
    UPDATE shot_prompt_compositions SET panel_id = NEW.panel_id
    WHERE shot_design_id = NEW.id AND panel_id IS DISTINCT FROM NEW.panel_id;
    UPDATE nine_grid_generations SET panel_id = NEW.panel_id
    WHERE shot_design_id = NEW.id AND panel_id IS DISTINCT FROM NEW.panel_id;
  END IF;
  PERFORM canvas_sync_shot_pipeline(NEW.id);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_canvas_shot_pipeline ON shot_designs;
CREATE TRIGGER trg_canvas_shot_pipeline
  AFTER UPDATE OF
    panel_id, character_prompt_template_ids, prompt_composition_id, nine_grid_generation_id,
    character_prompt_status, final_prompt_status, nine_grid_status, selection_status
  ON shot_designs
  FOR EACH ROW
  WHEN (
    OLD.panel_id IS DISTINCT FROM NEW.panel_id
    OR OLD.character_prompt_template_ids IS DISTINCT FROM NEW.character_prompt_template_ids
    OR OLD.prompt_composition_id IS DISTINCT FROM NEW.prompt_composition_id
    OR OLD.nine_grid_generation_id IS DISTINCT FROM NEW.nine_grid_generation_id
    OR OLD.character_prompt_status IS DISTINCT FROM NEW.character_prompt_status
    OR OLD.final_prompt_status IS DISTINCT FROM NEW.final_prompt_status
    OR OLD.nine_grid_status IS DISTINCT FROM NEW.nine_grid_status
    OR OLD.selection_status IS DISTINCT FROM NEW.selection_status
  )
  EXECUTE FUNCTION canvas_shot_pipeline_trigger();

-- 4. 合成与九宫格记录写入时按镜头填 panel_id，始终等于镜头当前的分镜。
--    只取仍存在的分镜：分镜被删除时外键先把 panel_id 置空，这里不能再填回已删除的分镜。
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

DROP TRIGGER IF EXISTS trg_canvas_fill_composition_panel ON shot_prompt_compositions;
CREATE TRIGGER trg_canvas_fill_composition_panel
  BEFORE INSERT OR UPDATE OF shot_design_id, panel_id ON shot_prompt_compositions
  FOR EACH ROW EXECUTE FUNCTION canvas_fill_record_panel();

DROP TRIGGER IF EXISTS trg_canvas_fill_nine_grid_panel ON nine_grid_generations;
CREATE TRIGGER trg_canvas_fill_nine_grid_panel
  BEFORE INSERT OR UPDATE OF shot_design_id, panel_id ON nine_grid_generations
  FOR EACH ROW EXECUTE FUNCTION canvas_fill_record_panel();

-- 5. 回填
DO $$
DECLARE
  v_shot uuid;
BEGIN
  FOR v_shot IN SELECT id FROM shot_designs WHERE panel_id IS NOT NULL LOOP
    PERFORM canvas_sync_shot_pipeline(v_shot);
  END LOOP;
END $$;

UPDATE shot_prompt_compositions c SET panel_id = p.id
FROM shot_designs sd JOIN panels p ON p.id = sd.panel_id
WHERE sd.id = c.shot_design_id AND c.panel_id IS DISTINCT FROM p.id;

UPDATE nine_grid_generations n SET panel_id = p.id
FROM shot_designs sd JOIN panels p ON p.id = sd.panel_id
WHERE sd.id = n.shot_design_id AND n.panel_id IS DISTINCT FROM p.id;

COMMIT;
