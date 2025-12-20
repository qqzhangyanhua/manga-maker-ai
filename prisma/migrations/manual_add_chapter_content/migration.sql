-- AlterTable chapters: Add new fields for content tracking
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "is_key_chapter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "key_chapter_reason" TEXT;

-- CreateTable chapter_character_states
CREATE TABLE IF NOT EXISTS "chapter_character_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "location" TEXT,
    "physical_condition" TEXT,
    "mental_state" TEXT,
    "key_items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relationship_changes" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_character_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_chapters_key" ON "chapters"("story_id", "is_key_chapter");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "unique_chapter_character_state" ON "chapter_character_states"("chapter_id", "character_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_chapter_character_states_chapter" ON "chapter_character_states"("chapter_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_chapter_character_states_character" ON "chapter_character_states"("character_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chapter_character_states_chapter_id_fkey'
    ) THEN
        ALTER TABLE "chapter_character_states" ADD CONSTRAINT "chapter_character_states_chapter_id_fkey"
        FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chapter_character_states_character_id_fkey'
    ) THEN
        ALTER TABLE "chapter_character_states" ADD CONSTRAINT "chapter_character_states_character_id_fkey"
        FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
