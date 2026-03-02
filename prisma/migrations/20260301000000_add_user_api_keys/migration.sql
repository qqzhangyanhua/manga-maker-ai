-- CreateTable
CREATE TABLE "user_api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "base_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique constraint for one key per user per provider)
CREATE UNIQUE INDEX "unique_user_provider" ON "user_api_keys"("user_id", "provider");

-- CreateIndex
CREATE INDEX "idx_user_api_keys_user_id" ON "user_api_keys"("user_id");

-- AddForeignKey
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
