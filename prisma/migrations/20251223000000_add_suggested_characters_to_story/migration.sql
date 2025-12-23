-- Add suggested_characters JSON field to Story table
ALTER TABLE "stories" ADD COLUMN "suggested_characters" JSONB;

-- Add index for better query performance
CREATE INDEX "idx_stories_suggested_characters" ON "stories" USING GIN ("suggested_characters");

-- Add comment
COMMENT ON COLUMN "stories"."suggested_characters" IS 'AI分析的建议角色列表（第一步分析结果）';
