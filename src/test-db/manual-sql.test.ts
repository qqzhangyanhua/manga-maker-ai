import { describe, expect, it } from "vitest";
import {
  isAlreadyAppliedSqlError,
  listManualSqlFiles,
  routineStatements,
  shouldSkipMissingObject,
  splitSqlStatements,
} from "./manual-sql";

describe("手工 SQL 选择", () => {
  it("按文件名排序，并排除回滚脚本", () => {
    const files = listManualSqlFiles([
      "20261119_project_root_phase2_rollback.sql",
      "20261118_project_root_phase1.sql",
      "migration.sql",
      "20261119_project_root_phase2.sql",
      "notes.txt",
    ]);

    expect(files).toEqual([
      "20261118_project_root_phase1.sql",
      "20261119_project_root_phase2.sql",
    ]);
  });
});

describe("手工 SQL 语句切分", () => {
  it("保留函数体里的分号，并丢掉事务控制语句", () => {
    const sql = `
      BEGIN;
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "genre" TEXT;
      CREATE OR REPLACE FUNCTION demo() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        NEW.title := 'a;b';
        RETURN NEW;
      END $$;
      COMMIT;
    `;

    expect(splitSqlStatements(sql)).toEqual([
      'ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "genre" TEXT',
      `CREATE OR REPLACE FUNCTION demo() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        NEW.title := 'a;b';
        RETURN NEW;
      END $$`,
    ]);
  });
});

describe("当前 schema 里没有的对象", () => {
  it("索引和补列可以跳过，函数和触发器不行", () => {
    expect(shouldSkipMissingObject("CREATE INDEX idx_scene ON scene_images(location_key)")).toBe(true);
    expect(shouldSkipMissingObject("ALTER TABLE shot_designs ADD COLUMN shared_scene_id UUID")).toBe(true);
    expect(shouldSkipMissingObject("CREATE OR REPLACE FUNCTION demo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$")).toBe(false);
    expect(shouldSkipMissingObject("CREATE TRIGGER demo_trg BEFORE INSERT ON panels FOR EACH ROW EXECUTE FUNCTION demo()")).toBe(false);
    expect(shouldSkipMissingObject("DO $$ BEGIN PERFORM 1; END $$")).toBe(false);
  });
});

describe("迁移里 schema 没有的例程", () => {
  it("只抽出函数、触发器和 DO，留下建表语句", () => {
    const sql = `
      ALTER TABLE "users" ADD COLUMN "nickname" TEXT;
      CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
      DROP TRIGGER IF EXISTS touch_users ON "users";
      CREATE TRIGGER touch_users BEFORE UPDATE ON "users"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      DO $$ BEGIN PERFORM 1; END $$;
    `;

    expect(routineStatements(sql)).toEqual([
      `CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`,
      'DROP TRIGGER IF EXISTS touch_users ON "users"',
      `CREATE TRIGGER touch_users BEFORE UPDATE ON "users"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      "DO $$ BEGIN PERFORM 1; END $$",
    ]);
  });
});

describe("已经存在的数据库对象", () => {
  it("只把重复对象错误当成可以跳过", () => {
    expect(isAlreadyAppliedSqlError({ code: "42701" })).toBe(true);
    expect(isAlreadyAppliedSqlError({ code: "42P07" })).toBe(true);
    expect(isAlreadyAppliedSqlError({ code: "42710" })).toBe(true);
    expect(isAlreadyAppliedSqlError({ code: "42P01" })).toBe(false);
    expect(isAlreadyAppliedSqlError(new Error("duplicate"))).toBe(false);
  });
});
