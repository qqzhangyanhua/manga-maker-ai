import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet, add, panelsMock } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const add = vi.fn();
  const panelsMock = vi.fn(() => ({ add, setLead: vi.fn() }));
  return { mockCookieGet, add, panelsMock };
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

vi.mock("@/lib/project/chapter-panels", () => ({
  panels: panelsMock,
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
    $executeRaw: vi.fn(),
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
  $executeRaw: ReturnType<typeof vi.fn>;
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
  const executeRaw = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.project.findUnique.mockResolvedValue({ id: projectId, user_id: userId });
    mocked.panel.findFirst.mockResolvedValue({
      id: "ch2-end",
      chapter_id: "c2",
      panel_order: 1,
    });
    mocked.panel.findMany.mockResolvedValue([]);
    add.mockResolvedValue([{ id: "new-panel", panelOrder: 2 }]);
    mocked.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn !== "function") {
        throw new Error("expected transaction callback");
      }
      return (fn as (tx: {
        $executeRaw: typeof executeRaw;
        panel: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
      }) => Promise<unknown>)({
        $executeRaw: executeRaw,
        panel: {
          findUnique: vi.fn().mockResolvedValue({
            id: "new-panel",
            chapter_id: "c2",
            panel_order: 2,
          }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      });
    });
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
    expect(data.message).toBe("分镜已插入");
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]?.[1]).toEqual({ after: "ch2-end" });
    expect(ensureDefaultChapter).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
    expect(mocked.$executeRaw).not.toHaveBeenCalled();
  });
});
