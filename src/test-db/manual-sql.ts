const ALREADY_APPLIED_CODES = new Set(["42701", "42P07", "42710"]);

/** 按文件名排序，排除回滚脚本和非 SQL 文件。 */
export function listManualSqlFiles(names: string[]): string[] {
  return names
    .filter((name) => name.endsWith(".sql") && name !== "migration.sql" && !name.toLowerCase().includes("rollback"))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function visibleSql(statement: string): string {
  return statement
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "")
    .trim();
}

function isTransactionControl(statement: string): boolean {
  return /^(begin|commit|rollback)$/i.test(visibleSql(statement));
}

/**
 * 按分号切开 SQL。函数体用 $$ 包住，里面的分号保留。
 * BEGIN/COMMIT 由调用方自己的事务包住，这里丢掉，避免文件中途提交。
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let index = 0;
  let dollarTag: string | null = null;

  while (index < sql.length) {
    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += sql[index];
      index += 1;
      continue;
    }

    if (sql.startsWith("--", index)) {
      const end = sql.indexOf("\n", index);
      const next = end === -1 ? sql.length : end + 1;
      current += sql.slice(index, next);
      index = next;
      continue;
    }

    if (sql.startsWith("/*", index)) {
      const end = sql.indexOf("*/", index + 2);
      const next = end === -1 ? sql.length : end + 2;
      current += sql.slice(index, next);
      index = next;
      continue;
    }

    if (sql[index] === "'") {
      current += sql[index];
      index += 1;
      while (index < sql.length) {
        current += sql[index];
        if (sql[index] === "'" && sql[index + 1] === "'") {
          current += sql[index + 1];
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (sql[index] === "$") {
      const match = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(index));
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length;
        continue;
      }
    }

    if (sql[index] === ";") {
      pushStatement(statements, current);
      current = "";
      index += 1;
      continue;
    }

    current += sql[index];
    index += 1;
  }

  pushStatement(statements, current);
  return statements;
}

function pushStatement(statements: string[], raw: string): void {
  const statement = raw.trim();
  if (!statement || !visibleSql(statement) || isTransactionControl(statement)) {
    return;
  }
  statements.push(statement);
}

function isRoutineStatement(statement: string): boolean {
  const visible = visibleSql(statement);
  return /^(create(\s+or\s+replace)?\s+(function|procedure|trigger)|drop\s+(function|trigger)|do)\b/i.test(visible);
}

/**
 * 缺表或缺列时，索引和补列可以先延后。
 * 函数、触发器和 DO 块不能跳过，它们才是手工 SQL 相对 schema 多出来的部分。
 */
export function shouldSkipMissingObject(statement: string): boolean {
  return !isRoutineStatement(statement);
}

/** schema.prisma 建不出的函数、触发器和 DO。历史迁移里只重放这些语句。 */
export function routineStatements(sql: string): string[] {
  return splitSqlStatements(sql).filter((statement) => isRoutineStatement(statement));
}

/** 对象已经存在时，这条历史 SQL 的目标已经达到，可以跳过。 */
export function isAlreadyAppliedSqlError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = error.code;
  return typeof code === "string" && ALREADY_APPLIED_CODES.has(code);
}
