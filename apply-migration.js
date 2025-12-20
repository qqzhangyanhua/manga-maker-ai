#!/usr/bin/env node

/**
 * Manual migration script for adding chapter content and character states
 * Run this with: node apply-migration.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('Starting manual migration...');

  try {
    console.log('1. Adding content column to chapters...');
    await prisma.$executeRaw`ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "content" TEXT`;

    console.log('2. Adding is_key_chapter column to chapters...');
    await prisma.$executeRaw`ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "is_key_chapter" BOOLEAN NOT NULL DEFAULT false`;

    console.log('3. Adding key_chapter_reason column to chapters...');
    await prisma.$executeRaw`ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "key_chapter_reason" TEXT`;

    console.log('4. Creating chapter_character_states table...');
    await prisma.$executeRawUnsafe(`
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
      )
    `);

    console.log('5. Creating index idx_chapters_key...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_chapters_key" ON "chapters"("story_id", "is_key_chapter")`);

    console.log('6. Creating unique index...');
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "unique_chapter_character_state" ON "chapter_character_states"("chapter_id", "character_id")`);

    console.log('7. Creating index idx_chapter_character_states_chapter...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_chapter_character_states_chapter" ON "chapter_character_states"("chapter_id")`);

    console.log('8. Creating index idx_chapter_character_states_character...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_chapter_character_states_character" ON "chapter_character_states"("character_id")`);

    console.log('9. Adding foreign key for chapter_id...');
    await prisma.$executeRawUnsafe(`
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
    `);

    console.log('10. Adding foreign key for character_id...');
    await prisma.$executeRawUnsafe(`
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
    `);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
