import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { listManualSqlFiles, splitSqlStatements } from "../../../test-db/manual-sql";

const manualDir = path.resolve("prisma/migrations/manual");
const dryRunFile = "20261128_chapter_panel_order_dry_run.sql";
const migrationFile = "20261128_chapter_panel_order.sql";
const rollbackFile = "20261128_chapter_panel_order_rollback.sql";

function visibleSql(statement: string): string {
  return statement
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "")
    .trim()
    .toLowerCase();
}

describe("章节重编号脚本", () => {
  it("dry-run 只有查询，回滚脚本不会在准备测试库时执行", () => {
    const applied = listManualSqlFiles(readdirSync(manualDir));
    expect(applied).toContain(migrationFile);
    expect(applied).toContain(dryRunFile);
    expect(applied).not.toContain(rollbackFile);

    const statements = splitSqlStatements(readFileSync(path.join(manualDir, dryRunFile), "utf8"));
    expect(statements.length).toBe(1);
    const visible = visibleSql(statements[0] ?? "");
    expect(visible.startsWith("select") || visible.startsWith("with")).toBe(true);
    expect(visible).not.toMatch(/\b(insert|update|delete|create|drop|alter|truncate)\b/);
    expect(visible).toContain("project_character_id is not null");
  });

  it("迁移语句完整切开，回滚会去掉触发器并恢复 5c-4 函数", () => {
    const migration = splitSqlStatements(readFileSync(path.join(manualDir, migrationFile), "utf8"));
    const visible = migration.map(visibleSql);
    expect(visible.filter((statement) => statement.startsWith("create or replace function"))).toHaveLength(4);
    expect(visible.some((statement) => statement.includes("canvas_renumber_chapter_panels"))).toBe(true);
    expect(visible.some((statement) => statement.includes("canvas_move_segment_panels"))).toBe(true);
    expect(visible.some((statement) => statement.includes("canvas_segment_panel_trigger"))).toBe(true);
    expect(visible.some((statement) => statement.includes("trg_panel_characters_sync_lead"))).toBe(true);
    const inserts = visible.filter((statement) => statement.startsWith("insert"));
    expect(inserts).toHaveLength(2);
    for (const insert of inserts) {
      expect(insert).toContain("project_character_id is not null");
    }

    const rollback = splitSqlStatements(readFileSync(path.join(manualDir, rollbackFile), "utf8")).map(visibleSql);
    expect(rollback.some((statement) => statement.startsWith("drop trigger"))).toBe(true);
    expect(rollback.some((statement) => statement.startsWith("drop function"))).toBe(true);
    expect(rollback.filter((statement) => statement.startsWith("create or replace function"))).toHaveLength(3);
    expect(rollback.some((statement) => statement.includes("canvas_segment_panel_trigger"))).toBe(true);
  });
});
