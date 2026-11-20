import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  isAlreadyAppliedSqlError,
  listManualSqlFiles,
  routineStatements,
  shouldSkipMissingObject,
  splitSqlStatements,
} from "./manual-sql";
import { isDedicatedTestDatabaseName, isSqlIdentifier } from "./resolve-test-database";

const prismaCli = path.resolve("node_modules/prisma/build/index.js");
const migrationsDir = path.resolve("prisma/migrations");
const manualSqlDir = path.resolve("prisma/migrations/manual");

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, "\"\"")}"`;
}

function maintenanceUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

async function withClient<T>(connectionString: string, run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export async function ensureTestDatabase(databaseUrl: string, database: string): Promise<void> {
  await withClient(maintenanceUrl(databaseUrl), async (client) => {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
      console.log(`已创建测试库 ${database}`);
      return;
    }
    console.log(`测试库 ${database} 已存在`);
  });
}

function runPrisma(args: string[], databaseUrl: string): void {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DATABASE_SSL: "false",
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
    },
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} 失败，退出码 ${result.status ?? "null"}`);
  }
}

function listPrismaMigrations(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => {
      try {
        return statSync(path.join(migrationsDir, name, "migration.sql")).isFile();
      } catch {
        return false;
      }
    })
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

async function relationExists(client: Client, relation: string): Promise<boolean> {
  const result = await client.query<{ name: string | null }>(
    "SELECT to_regclass($1)::text AS name",
    [relation],
  );
  return Boolean(result.rows[0]?.name);
}

async function appliedMigrationNames(client: Client): Promise<Set<string>> {
  if (!(await relationExists(client, "public._prisma_migrations"))) {
    return new Set();
  }
  const rows = await client.query<{ migration_name: string }>(
    "SELECT migration_name FROM _prisma_migrations",
  );
  return new Set(rows.rows.map((row) => row.migration_name));
}

class ManualSqlError extends Error {
  readonly sqlState: string | null;

  constructor(message: string, sqlState: string | null) {
    super(message);
    this.name = "ManualSqlError";
    this.sqlState = sqlState;
  }
}

function sqlStateOf(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
}

function isMissingDependency(error: unknown): boolean {
  return error instanceof ManualSqlError && (error.sqlState === "42P01" || error.sqlState === "42703");
}

type DeferredSql = { fileName: string; statement: string };

/**
 * 迁移历史为空时，db push 已经把 schema 里的表建好，这些迁移标成已应用。
 * 历史一旦有记录，新迁移必须留给 migrate deploy 真正执行。
 */
export function migrationNamesToResolve(appliedNames: ReadonlySet<string>, migrationNames: string[]): string[] {
  if (appliedNames.size > 0) return [];
  return migrationNames.filter((name) => !appliedNames.has(name));
}

async function applyManualFile(client: Client, fileName: string, deferred: DeferredSql[]): Promise<void> {
  const statements = splitSqlStatements(readFileSync(path.join(manualSqlDir, fileName), "utf8"));
  console.log(`执行手工 SQL ${fileName}（${statements.length} 条）`);
  await client.query("BEGIN");
  let skippedExisting = 0;
  const deferredBefore = deferred.length;
  try {
    for (let index = 0; index < statements.length; index += 1) {
      const statement = statements[index];
      const savepoint = `manual_sql_${index}`;
      await client.query(`SAVEPOINT ${savepoint}`);
      try {
        await client.query(statement);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        const sqlState = sqlStateOf(error);
        const missingObject = (sqlState === "42P01" || sqlState === "42703") && shouldSkipMissingObject(statement);
        if (isAlreadyAppliedSqlError(error)) {
          skippedExisting += 1;
          continue;
        }
        if (missingObject) {
          deferred.push({ fileName, statement });
          continue;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new ManualSqlError(`${fileName} 第 ${index + 1} 条失败: ${message}`, sqlState);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    deferred.length = deferredBefore;
    await client.query("ROLLBACK");
    throw error;
  }
  const deferredNow = deferred.length - deferredBefore;
  if (skippedExisting > 0 || deferredNow > 0) {
    console.log(`${fileName}：跳过已存在 ${skippedExisting} 条，延后 ${deferredNow} 条`);
  }
}

/**
 * 仓库里的 Prisma 迁移是增量补丁，没有从空库建出 users 等基表的初始迁移。
 * 空库先按 schema.prisma 建表。只有迁移历史还是空的时候，才把这些目录标成已应用。
 * 之后新增的迁移交给 migrate deploy 执行。schema 里没有的函数和触发器单独重放。
 */
export async function prepareTestDatabase(databaseUrl: string): Promise<void> {
  const database = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
  if (!isSqlIdentifier(database) || !isDedicatedTestDatabaseName(database)) {
    throw new Error(`拒绝准备测试库 ${database || "(空)"}。库名必须包含 test，且只能含字母、数字和下划线。`);
  }
  await ensureTestDatabase(databaseUrl, database);

  await withClient(databaseUrl, async (client) => {
    if (!(await relationExists(client, "public.users"))) {
      console.log("测试库还没有基表，按 schema.prisma 建表");
      runPrisma(["db", "push", "--skip-generate", "--accept-data-loss"], databaseUrl);
    }

    const applied = await appliedMigrationNames(client);
    for (const name of migrationNamesToResolve(applied, listPrismaMigrations())) {
      console.log(`标记已应用的迁移 ${name}`);
      runPrisma(["migrate", "resolve", "--applied", name], databaseUrl);
    }
  });

  console.log("执行 prisma migrate deploy");
  runPrisma(["migrate", "deploy"], databaseUrl);
  await applyMigrationRoutines(databaseUrl);

  const manualFiles = listManualSqlFiles(readdirSync(manualSqlDir));
  await withClient(databaseUrl, async (client) => {
    await applyManualSqlFiles(client, manualFiles);
  });
}

async function applyMigrationRoutines(databaseUrl: string): Promise<void> {
  const statements = listPrismaMigrations().flatMap((name) => {
    const sql = readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8");
    return routineStatements(sql).map((statement) => ({ name, statement }));
  });
  if (statements.length === 0) return;

  console.log(`执行迁移中的函数和触发器 ${statements.length} 条`);
  await withClient(databaseUrl, async (client) => {
    for (const item of statements) {
      try {
        await client.query(item.statement);
      } catch (error) {
        if (isAlreadyAppliedSqlError(error)) continue;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${item.name} 的函数或触发器失败: ${message}`);
      }
    }
  });
}

/**
 * 文件名顺序和建表顺序不完全一致。
 * 函数、触发器和 DO 缺表时整份回滚，等后面的脚本建好再试。
 * 补列和索引缺表时先记下，等全部文件走完再补；仍然没有的对象才跳过。
 */
async function applyManualSqlFiles(client: Client, fileNames: string[]): Promise<void> {
  const deferred: DeferredSql[] = [];
  let pending = fileNames;
  for (let pass = 0; pending.length > 0; pass += 1) {
    if (pass > fileNames.length) {
      throw new Error("手工 SQL 重试次数已用完");
    }
    const blocked: string[] = [];
    let applied = 0;
    let blockedError: ManualSqlError | null = null;
    for (const fileName of pending) {
      try {
        await applyManualFile(client, fileName, deferred);
        applied += 1;
      } catch (error) {
        if (!isMissingDependency(error)) throw error;
        blocked.push(fileName);
        blockedError = error;
        console.log(`${fileName} 依赖尚未就绪，稍后重试`);
      }
    }
    if (blocked.length === 0) break;
    if (applied === 0) {
      throw blockedError ?? new Error("手工 SQL 缺少依赖");
    }
    pending = blocked;
  }
  await retryDeferredStatements(client, deferred);
}

async function retryDeferredStatements(client: Client, deferred: DeferredSql[]): Promise<void> {
  let pending = deferred;
  const initialCount = deferred.length;
  for (let pass = 0; pending.length > 0; pass += 1) {
    if (pass > initialCount) {
      throw new Error("手工 SQL 重试次数已用完");
    }
    const still: DeferredSql[] = [];
    let applied = 0;
    for (const item of pending) {
      try {
        await client.query(item.statement);
        applied += 1;
      } catch (error) {
        if (isAlreadyAppliedSqlError(error)) {
          applied += 1;
          continue;
        }
        const sqlState = sqlStateOf(error);
        const stillMissing = (sqlState === "42P01" || sqlState === "42703") && shouldSkipMissingObject(item.statement);
        if (stillMissing) {
          still.push(item);
          continue;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new ManualSqlError(`${item.fileName} 补试失败: ${message}`, sqlState);
      }
    }
    if (still.length === 0) {
      if (initialCount > 0) console.log(`延后的手工 SQL 已补上 ${initialCount} 条`);
      return;
    }
    if (applied === 0) {
      console.log(`当前库没有的对象，跳过 ${still.length} 条`);
      return;
    }
    pending = still;
  }
}
