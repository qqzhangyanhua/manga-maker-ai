import { describe, expect, it } from "vitest";
import { resolveTestDatabase } from "./resolve-test-database";

const localUrl = "postgresql://manga:manga123@127.0.0.1:5432/manga_test";

describe("测试库连接配置", () => {
  it("未设置 TEST_DATABASE_URL 时跳过，即使应用库地址存在", () => {
    const decision = resolveTestDatabase({
      DATABASE_URL: "postgresql://manga:manga123@111.228.37.74:5432/cartoon",
    });

    expect(decision).toEqual({
      action: "skip",
      message: expect.stringContaining("已跳过"),
    });
  });

  it("空白的 TEST_DATABASE_URL 视为未配置", () => {
    const decision = resolveTestDatabase({ TEST_DATABASE_URL: "   " });

    expect(decision.action).toBe("skip");
    if (decision.action === "skip") {
      expect(decision.message).toContain("已跳过");
    }
  });

  it("本机且库名包含 test 时使用该连接", () => {
    const decision = resolveTestDatabase({ TEST_DATABASE_URL: localUrl });

    expect(decision).toEqual({ action: "run", url: localUrl });
  });

  it("拒绝非本机地址，避免对远端库执行迁移", () => {
    const decision = resolveTestDatabase({
      TEST_DATABASE_URL: "postgresql://manga:manga123@111.228.37.74:5432/manga_test",
    });

    expect(decision.action).toBe("refuse");
  });

  it("拒绝库名里没有 test 的本机库", () => {
    const decision = resolveTestDatabase({
      TEST_DATABASE_URL: "postgresql://manga:manga123@127.0.0.1:5432/manga",
    });

    expect(decision.action).toBe("refuse");
  });
});
