-- 回滚 20261129_chapter_panel_constraints.sql。不改编号，也不改主角色列。

BEGIN;

DROP TRIGGER IF EXISTS trg_panels_reject_inconsistent_lead ON panels;
DROP FUNCTION IF EXISTS panels_reject_inconsistent_lead();

ALTER TABLE panels DROP CONSTRAINT IF EXISTS panels_chapter_panel_order_key;

COMMIT;
