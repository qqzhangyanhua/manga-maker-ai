import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    const migrationPath = path.join(
      process.cwd(),
      "prisma/migrations/20251214122712_add_gallery_sharing/migration.sql"
    );

    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("Applying gallery sharing migration...");

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`);
      await prisma.$executeRawUnsafe(statement);
    }

    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
