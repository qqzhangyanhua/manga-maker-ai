-- Diagnose Shot Generation Status
-- This script helps identify shots that are stuck in "generating" status

-- 1. Count shots by generation_status
SELECT
    generation_status,
    COUNT(*) as count
FROM shot_designs
GROUP BY generation_status
ORDER BY count DESC;

-- 2. Find shots in "generating" status for more than 5 minutes
SELECT
    id,
    shot_order,
    generation_status,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_since_created,
    prompt
FROM shot_designs
WHERE generation_status = 'generating'
    AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at ASC;

-- 3. Check specific chapter's shots (replace with your chapter ID)
-- Uncomment and replace 'YOUR_CHAPTER_ID' with actual chapter ID:
/*
SELECT
    sd.id,
    sd.shot_order,
    sd.generation_status,
    sd.generated_image_url,
    sd.created_at,
    ss.timeline_chapter_id
FROM shot_designs sd
JOIN script_segments ss ON sd.script_segment_id = ss.id
WHERE ss.timeline_chapter_id = 'YOUR_CHAPTER_ID'
ORDER BY sd.shot_order;
*/

-- 4. Fix stuck shots (use with caution!)
-- Uncomment to reset all shots stuck in "generating" for more than 10 minutes:
/*
UPDATE shot_designs
SET generation_status = 'error'
WHERE generation_status = 'generating'
    AND created_at < NOW() - INTERVAL '10 minutes';
*/
