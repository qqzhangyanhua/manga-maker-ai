/**
 * Data Migration Script: Story.suggested_characters JSONB → SuggestedCharacter table
 *
 * This script migrates existing JSONB data to the new normalized table structure.
 * Run after applying the SQL migration.
 *
 * Usage: npx tsx scripts/migrate-suggested-characters.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface SuggestedCharactersData {
  version: string;
  generated_at: string;
  characters: {
    temp_id: string;
    name: string;
    description: string;
    appearance: string;
    role: string;
    generated: boolean;
    character_id: string | null;
    generated_at?: string;
    image_url?: string;
    optimized_prompt?: string;
  }[];
  comic_style_id: string | null;
  settings: {
    count: number;
    temperature: number;
  };
}

async function migrateSuggestedCharacters(): Promise<void> {
  console.log("\n=== Migrating Story.suggested_characters JSONB to Table ===\n");

  // Find all stories with suggested_characters JSONB data
  const stories = await prisma.story.findMany({
    where: {
      suggested_characters: { not: Prisma.DbNull },
    },
    select: {
      id: true,
      title: true,
      suggested_characters: true,
    },
  });

  console.log(`Found ${stories.length} stories with suggested_characters data\n`);

  let totalMigrated = 0;
  let errorCount = 0;

  for (const story of stories) {
    try {
      const data = story.suggested_characters as unknown as SuggestedCharactersData;

      if (!data?.characters || !Array.isArray(data.characters)) {
        console.log(`  [SKIP] Story "${story.title}": No valid characters array`);
        continue;
      }

      console.log(`\n  Processing Story: "${story.title}" (${data.characters.length} characters)`);

      // Create suggested_characters records
      let order = 0;
      for (const char of data.characters) {
        try {
          await prisma.suggestedCharacter.create({
            data: {
              story_id: story.id,
              name: char.name,
              description: char.description,
              appearance: char.appearance,
              role: char.role || "supporting",
              generated: char.generated || false,
              character_id: char.character_id || null,
              image_url: char.image_url || null,
              optimized_prompt: char.optimized_prompt || null,
              generated_at: char.generated_at ? new Date(char.generated_at) : null,
              display_order: order++,
            },
          });

          console.log(`    [MIGRATED] ${char.name} (role: ${char.role}, generated: ${char.generated})`);
          totalMigrated++;
        } catch (charError) {
          console.error(`    [ERROR] Failed to migrate character "${char.name}":`, charError);
          errorCount++;
        }
      }
    } catch (error) {
      console.error(`  [ERROR] Failed to process story "${story.title}":`, error);
      errorCount++;
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`  Total suggested characters migrated: ${totalMigrated}`);
  console.log(`  Errors: ${errorCount}`);
}

async function verifyMigration(): Promise<void> {
  console.log("\n=== Verifying Migration ===\n");

  const totalSuggested = await prisma.suggestedCharacter.count();
  const generatedCount = await prisma.suggestedCharacter.count({
    where: { generated: true },
  });
  const linkedCount = await prisma.suggestedCharacter.count({
    where: { character_id: { not: null } },
  });

  console.log(`  Total suggested_characters records: ${totalSuggested}`);
  console.log(`  Characters with generated=true: ${generatedCount}`);
  console.log(`  Characters linked to Character table: ${linkedCount}`);

  // Sample: Show first 5 suggested characters
  const samples = await prisma.suggestedCharacter.findMany({
    take: 5,
    include: {
      story: { select: { title: true } },
      character: { select: { name: true } },
    },
    orderBy: { created_at: "desc" },
  });

  if (samples.length > 0) {
    console.log(`\n  Sample Records:`);
    for (const sample of samples) {
      console.log(`    - ${sample.name} (Story: "${sample.story.title}", Generated: ${sample.generated})`);
      if (sample.character) {
        console.log(`      Linked to Character: ${sample.character.name}`);
      }
    }
  }
}

async function main(): Promise<void> {
  console.log("========================================");
  console.log("  SuggestedCharacter Data Migration");
  console.log("  Week 3 Task 2");
  console.log("========================================");

  try {
    await migrateSuggestedCharacters();
    await verifyMigration();

    console.log("\n========================================");
    console.log("  Migration completed successfully!");
    console.log("========================================");
    console.log("\nNext steps:");
    console.log("1. Verify the data in suggested_characters table");
    console.log("2. Update API routes to use new table structure");
    console.log("3. Test all endpoints");
    console.log("4. Once confirmed working, drop Story.suggested_characters JSONB field\n");
  } catch (error) {
    console.error("\nMigration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main();
