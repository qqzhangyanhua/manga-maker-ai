-- 回滚 20261119_project_root_phase2.sql：删除双写触发器和主项目唯一索引
-- 已同步到 Project / ProjectCharacter 的数据保留不动（阶段 1 回滚脚本负责清理这些列和表）

BEGIN;

DROP TRIGGER IF EXISTS trg_project_root_sync_story ON stories;
DROP TRIGGER IF EXISTS trg_project_root_fill_chapter ON chapters;
DROP TRIGGER IF EXISTS trg_project_root_fill_suggested ON suggested_characters;
DROP TRIGGER IF EXISTS trg_project_root_sync_story_character ON story_characters;

DROP FUNCTION IF EXISTS project_root_sync_story();
DROP FUNCTION IF EXISTS project_root_fill_project_id();
DROP FUNCTION IF EXISTS project_root_sync_story_character();

DROP INDEX IF EXISTS "unique_projects_story";

COMMIT;
