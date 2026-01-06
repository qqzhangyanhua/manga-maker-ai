-- CreateTable: SuggestedCharacter
-- Replaces Story.suggested_characters JSONB field with normalized table
-- Created: 2026-01-06 (Week 3 Task 2)

CREATE TABLE "suggested_characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "story_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "appearance" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'supporting',
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "character_id" UUID,
    "image_url" TEXT,
    "optimized_prompt" TEXT,
    "generated_at" TIMESTAMPTZ(6),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_characters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_suggested_characters_story_generated" ON "suggested_characters"("story_id", "generated");

-- CreateIndex
CREATE INDEX "idx_suggested_characters_character" ON "suggested_characters"("character_id");

-- AddForeignKey
ALTER TABLE "suggested_characters" ADD CONSTRAINT "suggested_characters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_characters" ADD CONSTRAINT "suggested_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: Story.suggested_characters JSONB field will be kept temporarily for backward compatibility
-- It will be dropped after data migration is complete and all API routes are updated
