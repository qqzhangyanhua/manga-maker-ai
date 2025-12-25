-- 杩炶浇妯″紡鏀寔 - 鏁版嵁搴撹縼绉?
-- 鍒涘缓鏃堕棿: 2025-12-25

-- 1. 涓?stories 琛ㄦ坊鍔犺繛杞界浉鍏冲瓧娈?
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_serialized BOOLEAN DEFAULT true;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS serial_status VARCHAR(20) DEFAULT 'ongoing';

COMMENT ON COLUMN stories.is_serialized IS '鏄惁涓鸿繛杞戒綔鍝?;
COMMENT ON COLUMN stories.serial_status IS '杩炶浇鐘舵€? ongoing/completed/hiatus';

-- 2. 涓?chapters 琛ㄦ坊鍔犲彂甯冪姸鎬佸瓧娈?
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS publish_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

COMMENT ON COLUMN chapters.publish_status IS '绔犺妭鍙戝竷鐘舵€? draft/published/archived';
COMMENT ON COLUMN chapters.published_at IS '绔犺妭鍙戝竷鏃堕棿';

-- 3. 鍒涘缓绱㈠紩浠ヤ紭鍖栨煡璇?
CREATE INDEX IF NOT EXISTS idx_chapters_publish_status
ON chapters(story_id, publish_status);

CREATE INDEX IF NOT EXISTS idx_stories_serialized
ON stories(is_serialized, serial_status);

-- 4. 鏇存柊鐜版湁鏁版嵁锛堟墍鏈夌幇鏈夌珷鑺傞粯璁や负宸插彂甯冿級
UPDATE chapters
SET publish_status = 'published', published_at = created_at
WHERE publish_status IS NULL OR publish_status = '';

UPDATE stories
SET is_serialized = true, serial_status = COALESCE(serial_status, 'ongoing')
WHERE is_serialized IS NULL;

-- 5. 楠岃瘉杩佺Щ
DO $$
BEGIN
    -- 妫€鏌?stories 琛?
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stories' AND column_name = 'is_serialized'
    ) THEN
        RAISE EXCEPTION 'Migration failed: stories.is_serialized not found';
    END IF;

    -- 妫€鏌?chapters 琛?
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chapters' AND column_name = 'publish_status'
    ) THEN
        RAISE EXCEPTION 'Migration failed: chapters.publish_status not found';
    END IF;

    RAISE NOTICE 'Migration completed successfully!';
END $$;

