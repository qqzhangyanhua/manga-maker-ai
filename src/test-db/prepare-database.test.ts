import { describe, expect, it } from "vitest";
import { migrationNamesToResolve } from "./prepare-database";

describe("迁移基线", () => {
  it("迁移历史为空时，把 db push 已经体现的迁移全部标成已应用", () => {
    expect(migrationNamesToResolve(new Set(), ["20260101_init", "20260102_more"])).toEqual([
      "20260101_init",
      "20260102_more",
    ]);
  });

  it("已有迁移历史时，不把尚未执行的新迁移标成已应用", () => {
    expect(migrationNamesToResolve(new Set(["20260101_init"]), ["20260101_init", "20260102_more"])).toEqual([]);
  });
});
