import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  return { mockCookieGet };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockCookieGet }),
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/llm-provider", () => ({
  callChatCompletionStreamByType: vi.fn(),
}));

vi.mock("@/lib/project", () => ({
  ensureProjectCharacters: vi.fn(),
  filterOwnedCharacterIds: vi.fn(async () => new Set<string>()),
  ensureDefaultChapter: vi.fn(async () => "default-chapter"),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    panel: { findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { ensureDefaultChapter } from "@/lib/project";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const userId = "user-1";
const projectId = "11111111-1111-4111-8111-111111111111";

const mocked = prisma as unknown as {
  project: { findUnique: ReturnType<typeof vi.fn> };
  panel: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function insert(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/panel/insert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/panel/insert 插入到末尾", () => {
  const sql: { text: string; values: unknown[] }[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    sql.length = 0;
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.project.findUnique.mockResolvedValue({ id: projectId, user_id: userId });
    mocked.panel.findFirst.mockResolvedValue({
      id: "ch2-end",
      chapter_id: "c2",
      panel_order: 1,
    });
    mocked.panel.findMany.mockResolvedValue([]);
    mocked.$transaction.mockImplementation(async (fn: (tx: {
      $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<void>;
      panel: { create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>> };
    }) => Promise<unknown>) =>
      fn({
        $executeRaw: async (strings, ...values) => {
          sql.push({ text: strings.join(" "), values });
        },
        panel: {
          create: async ({ data }) => ({ id: "new-panel", ...data }),
        },
      }),
    );
  });

  it("锚在第二章最后一格时，新分镜接在该章后面，第一章不动", async () => {
    const response = await insert({
      project_id: projectId,
      insert_after_order: 99,
      insert_after_panel_id: "ch2-end",
      description: "结尾",
      use_llm: false,
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.panel.chapter_id).toBe("c2");
    expect(data.panel.panel_order).toBe(2);
    expect(sql).toHaveLength(1);
    expect(sql[0].text).toContain("chapter_id");
    expect(sql[0].values).toContain("c2");
    expect(sql[0].values).not.toContain(99);
    expect(ensureDefaultChapter).not.toHaveBeenCalled();
  });
});
