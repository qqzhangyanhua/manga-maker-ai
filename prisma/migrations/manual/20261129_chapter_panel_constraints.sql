-- 章节内编号唯一（提交时检查），并拒绝与第一位在场角色不一致的主角色写入。
-- 预览：20261129_chapter_panel_constraints_dry_run.sql
-- 回滚：20261129_chapter_panel_constraints_rollback.sql
-- 远端执行前必须先跑预览，确认没有重复编号。本脚本不改已有编号，也不改主角色。
-- 幂等：可以重复执行。

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'panels_chapter_panel_order_key'
  ) THEN
    ALTER TABLE panels
      ADD CONSTRAINT panels_chapter_panel_order_key
      UNIQUE (chapter_id, panel_order)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- 待绑定行不是在场角色。没有在场角色时，主角色三列必须都是空。
CREATE OR REPLACE FUNCTION panels_reject_inconsistent_lead() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_character uuid;
  v_outfit uuid;
  v_expression text;
BEGIN
  SELECT prc.character_id, pc.outfit_id, pc.expression_type
    INTO v_character, v_outfit, v_expression
  FROM panel_characters pc
  JOIN project_characters prc ON prc.id = pc.project_character_id
  WHERE pc.panel_id = NEW.id
    AND pc.project_character_id IS NOT NULL
  ORDER BY pc.sort_order, pc.created_at, pc.id
  LIMIT 1;

  IF NEW.character_id IS DISTINCT FROM v_character
     OR NEW.outfit_id IS DISTINCT FROM v_outfit
     OR NEW.expression_type IS DISTINCT FROM v_expression THEN
    RAISE EXCEPTION '主角色必须等于第一位在场角色'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_panels_reject_inconsistent_lead ON panels;
CREATE TRIGGER trg_panels_reject_inconsistent_lead
  BEFORE INSERT OR UPDATE OF character_id, outfit_id, expression_type ON panels
  FOR EACH ROW EXECUTE FUNCTION panels_reject_inconsistent_lead();

COMMIT;
