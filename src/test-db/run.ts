import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { mergeMissingEnv, parseEnvFile } from "./env-file";
import { prepareTestDatabase } from "./prepare-database";
import { resolveTestDatabase } from "./resolve-test-database";

function envWithTestFile(): NodeJS.ProcessEnv {
  const filePath = path.resolve(".env.test");
  if (!existsSync(filePath)) return process.env;
  return mergeMissingEnv(process.env, parseEnvFile(readFileSync(filePath, "utf8")));
}

const decision = resolveTestDatabase(envWithTestFile());

if (decision.action === "skip") {
  console.log(decision.message);
  process.exit(0);
}

if (decision.action === "refuse") {
  console.error(decision.message);
  process.exit(1);
}

const target = new URL(decision.url);
console.log(
  `test:db 连接 ${target.hostname}:${target.port || "5432"}/${target.pathname.replace(/^\//, "")}`,
);
await prepareTestDatabase(decision.url);

const vitest = spawnSync(
  process.execPath,
  [path.resolve("scripts/run-vitest.mjs"), "run", "--config", "vitest.db.config.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TEST_DATABASE_URL: decision.url,
      DATABASE_URL: decision.url,
      DATABASE_SSL: "false",
    },
  },
);

if (vitest.error) {
  console.error(vitest.error.message);
  process.exit(1);
}

process.exit(vitest.status ?? 1);
