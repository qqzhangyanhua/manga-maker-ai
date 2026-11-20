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

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PATCH } from "./route";

const userId = "user-1";

const mocked = prisma as unknown as {
  panel: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function layout(body: Record<string, unknown>) {
  return PATCH(
    new Request("http://localhost/api/panel/batch-layout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function panel(id: string, chapterId: string, panelOrder: number) {
  return {
    id,
    chapter_id: chapterId,
    panel_order: panelOrder,
    layout_hint: null,
    project_id: "project-1",
    project: { id: "project-1", user_id: userId },
  };
}

describe("PATCH /api/panel/batch-layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.$transaction.mockResolvedValue([]);
    mocked.panel.update.mockResolvedValue({});
    mocked.panel.updateMany.mockResolvedValue({ count: 1 });
  });

  it("跨章节且编号看起来连续时返回 400 和可读提示，不写布局", async () => {
    mocked.panel.findMany.mockResolvedValue([
      panel("ch1", "c1", 1),
      panel("ch2", "c2", 2),
    ]);

    const response = await layout({
      panelIds: ["ch1", "ch2"],
      layoutType: "2",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("所选分镜不在同一章节，请选择同一章节内的连续分镜");
    expect(mocked.$transaction).not.toHaveBeenCalled();
  });

  it("同一章节里连续的两格可以组成布局", async () => {
    const panels = [panel("a", "c1", 1), panel("b", "c1", 2)];
    mocked.panel.findMany
      .mockResolvedValueOnce(panels)
      .mockResolvedValueOnce(panels);

    const response = await layout({
      panelIds: ["a", "b"],
      layoutType: "2",
    });

    expect(response.status).toBe(200);
    expect(mocked.$transaction).toHaveBeenCalled();
  });
});
