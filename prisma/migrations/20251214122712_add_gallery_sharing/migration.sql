-- AlterTable
ALTER TABLE "panels" ADD COLUMN     "is_shared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shared_at" TIMESTAMPTZ(6),
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "show_prompt" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "idx_panels_shared" ON "panels"("is_shared", "shared_at");
