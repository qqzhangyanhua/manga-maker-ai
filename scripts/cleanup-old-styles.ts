import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupOldStyles(): Promise<void> {
  console.log("Cleaning up old comic styles with local paths...\n");

  const oldStyleKeys = ["european", "retro"];

  for (const styleKey of oldStyleKeys) {
    try {
      const result = await prisma.comicStyle.deleteMany({
        where: { style_key: styleKey },
      });

      if (result.count > 0) {
        console.log(`✓ Deleted style: ${styleKey} (${result.count} record(s))`);
      } else {
        console.log(`- Style not found: ${styleKey}`);
      }
    } catch (error) {
      console.error(`✗ Failed to delete ${styleKey}:`, error);
    }
  }

  console.log("\nCleanup completed!");
}

async function main(): Promise<void> {
  try {
    await cleanupOldStyles();
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
