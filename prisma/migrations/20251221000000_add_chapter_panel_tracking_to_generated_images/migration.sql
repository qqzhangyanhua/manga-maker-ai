-- AlterTable
ALTER TABLE "generated_images" ADD COLUMN "chapter_id" UUID;
ALTER TABLE "generated_images" ADD COLUMN "panel_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "idx_generated_images_chapter" ON "generated_images"("chapter_id");

