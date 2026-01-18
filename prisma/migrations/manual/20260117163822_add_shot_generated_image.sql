-- Add generated_image_url and generation_status to shot_designs table
ALTER TABLE "shot_designs" ADD COLUMN "generated_image_url" TEXT;
ALTER TABLE "shot_designs" ADD COLUMN "generation_status" TEXT NOT NULL DEFAULT 'pending';

-- Add index for generation_status for better query performance
CREATE INDEX IF NOT EXISTS "idx_shot_designs_generation_status" ON "shot_designs"("generation_status");
