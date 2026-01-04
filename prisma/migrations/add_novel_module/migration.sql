-- CreateTable: 小说项目
CREATE TABLE "novel_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "genre" VARCHAR(50),
    "world_setting" JSONB,
    "characters" JSONB,
    "target_words" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_words" INTEGER NOT NULL DEFAULT 0,
    "chapter_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novel_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 小说章节
CREATE TABLE "novel_chapters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "outline" TEXT,
    "content" TEXT,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "prompt_used" TEXT,
    "model_used" VARCHAR(100),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_key_chapter" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novel_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 章节版本
CREATE TABLE "novel_chapter_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "prompt_used" TEXT,
    "model_used" VARCHAR(100),
    "temperature" DOUBLE PRECISION DEFAULT 0.7,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "user_rating" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novel_chapter_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Prompt 模板
CREATE TABLE "novel_prompt_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID,
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novel_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: 用户配额
CREATE TABLE "novel_quotas" (
    "user_id" UUID NOT NULL,
    "daily_limit" INTEGER NOT NULL DEFAULT 50,
    "used_today" INTEGER NOT NULL DEFAULT 0,
    "tokens_used_total" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ(6) NOT NULL,
    "custom_api_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novel_quotas_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "idx_novel_projects_user_status" ON "novel_projects"("user_id", "status");
CREATE INDEX "idx_novel_projects_user_time" ON "novel_projects"("user_id", "updated_at");

CREATE INDEX "idx_novel_chapters_project_order" ON "novel_chapters"("project_id", "chapter_number");
CREATE INDEX "idx_novel_chapters_key" ON "novel_chapters"("project_id", "is_key_chapter");
CREATE UNIQUE INDEX "unique_novel_chapter_number" ON "novel_chapters"("project_id", "chapter_number");

CREATE INDEX "idx_chapter_versions_selected" ON "novel_chapter_versions"("chapter_id", "is_selected");
CREATE UNIQUE INDEX "unique_chapter_version" ON "novel_chapter_versions"("chapter_id", "version_number");

CREATE INDEX "idx_novel_prompts_category" ON "novel_prompt_templates"("category", "is_public");
CREATE INDEX "idx_novel_prompts_user" ON "novel_prompt_templates"("user_id");
CREATE INDEX "idx_novel_prompts_project" ON "novel_prompt_templates"("project_id");

-- AddForeignKey
ALTER TABLE "novel_chapters" ADD CONSTRAINT "novel_chapters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "novel_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "novel_chapter_versions" ADD CONSTRAINT "novel_chapter_versions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "novel_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "novel_prompt_templates" ADD CONSTRAINT "novel_prompt_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "novel_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
