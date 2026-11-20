import { describe, expect, it } from "vitest";
import { mergeMissingEnv, parseEnvFile } from "./env-file";

describe("解析 .env.test", () => {
  it("忽略注释和引号，缺省时才补进环境变量", () => {
    const parsed = parseEnvFile(`
      # comment
      TEST_DATABASE_URL="postgresql://manga:manga123@127.0.0.1:5432/manga_test"
      OTHER=plain
    `);

    expect(parsed.TEST_DATABASE_URL).toBe(
      "postgresql://manga:manga123@127.0.0.1:5432/manga_test",
    );
    expect(parsed.OTHER).toBe("plain");

    const merged = mergeMissingEnv(
      { TEST_DATABASE_URL: "postgresql://keep@127.0.0.1:5432/manga_test" },
      parsed,
    );
    expect(merged.TEST_DATABASE_URL).toBe("postgresql://keep@127.0.0.1:5432/manga_test");
    expect(merged.OTHER).toBe("plain");
  });
});
