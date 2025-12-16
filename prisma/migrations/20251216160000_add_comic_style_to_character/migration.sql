-- AlterTable
ALTER TABLE "characters" ADD COLUMN "comic_style_id" UUID;

-- CreateIndex
CREATE INDEX "idx_characters_comic_style" ON "characters"("comic_style_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_comic_style_id_fkey" FOREIGN KEY ("comic_style_id") REFERENCES "comic_styles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
