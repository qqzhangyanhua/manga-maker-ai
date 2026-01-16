CREATE TABLE "maintenance_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "operation" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_maintenance_logs_user_time" ON "maintenance_logs"("user_id", "created_at");

CREATE INDEX "idx_maintenance_logs_operation" ON "maintenance_logs"("operation");
