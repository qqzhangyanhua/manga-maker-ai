export type TestDatabaseDecision =
  | { action: "skip"; message: string }
  | { action: "run"; url: string }
  | { action: "refuse"; message: string };

const SKIP_MESSAGE = [
  "test:db 已跳过：未配置 TEST_DATABASE_URL。",
  "启动 docker compose 的 Postgres 后，在环境变量或 .env.test 里设置：",
  "TEST_DATABASE_URL=postgresql://manga:manga123@127.0.0.1:5432/manga_test",
  "说明见 docs/testing/test-db.md",
].join("\n");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isSqlIdentifier(name: string): boolean {
  return SQL_IDENTIFIER.test(name);
}

export function isDedicatedTestDatabaseName(name: string): boolean {
  return name.toLowerCase().includes("test");
}

/**
 * 只认 TEST_DATABASE_URL。应用的 DATABASE_URL 可能指向远端库，不能拿来做迁移。
 */
export function resolveTestDatabase(env: NodeJS.ProcessEnv): TestDatabaseDecision {
  const raw = env.TEST_DATABASE_URL;
  if (!raw || raw.trim() === "") {
    return { action: "skip", message: SKIP_MESSAGE };
  }

  const urlText = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(urlText);
  } catch {
    return { action: "refuse", message: "TEST_DATABASE_URL 不是合法的数据库连接串" };
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    return { action: "refuse", message: "TEST_DATABASE_URL 必须是 postgresql 连接串" };
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!LOCAL_HOSTS.has(host)) {
    return {
      action: "refuse",
      message: `TEST_DATABASE_URL 的主机是 ${host}。test:db 只连接本机 Postgres，不会对远端库执行迁移。`,
    };
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!isSqlIdentifier(database)) {
    return { action: "refuse", message: "测试库名只能包含字母、数字和下划线" };
  }
  if (!isDedicatedTestDatabaseName(database)) {
    return {
      action: "refuse",
      message: `测试库名是 ${database}。库名必须包含 test，避免迁到开发库。`,
    };
  }

  return { action: "run", url: urlText };
}
