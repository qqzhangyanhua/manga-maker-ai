import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookiesGet, mockCookies, mockPlace, mockPanels } = vi.hoisted(() => {
  const mockCookiesGet = vi.fn();
  const mockCookies = vi.fn();
  const mockPlace = vi.fn();
  const mockPanels = vi.fn(() => ({ place: mockPlace }));
  return { mockCookiesGet, mockCookies, mockPlace, mockPanels };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "test_cookie",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/project/chapter-panels", () => ({
  panels: mockPanels,
}));

import { verifyAuthToken } from "@/lib/auth";
import { ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { PUT } from "./route";

const mockUserId = "user-123";
const mockProjectId = "project-123";
const mockPanelId = "panel-123";

const mockPanel = {
  id: mockPanelId,
  project_id: mockProjectId,
  panel_order: 3,
  description: "Test panel",
  project: {
    user_id: mockUserId,
  },
};

const mocked = prisma as unknown as {
  panel: { findUnique: ReturnType<typeof vi.fn> };
  $executeRaw: ReturnType<typeof vi.fn>;
};

function reorder(body: Record<string, unknown>) {
  return PUT(
    new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("PUT /api/panel/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockCookies.mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: mockUserId,
    });
    mockPlace.mockResolvedValue([
      { id: mockPanelId, chapterId: "chapter-1", panelOrder: 1 },
    ]);
  });

  it("按锚点调用 place，不平移整表", async () => {
    mocked.panel.findUnique
      .mockResolvedValueOnce(mockPanel)
      .mockResolvedValueOnce({ ...mockPanel, panel_order: 1 });

    const response = await reorder({
      panel_id: mockPanelId,
      project_id: mockProjectId,
      after: "anchor-1",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("分镜顺序已更新");
    expect(data.panel.panel_order).toBe(1);
    expect(mockPanels).toHaveBeenCalledWith(mockProjectId);
    expect(mockPlace).toHaveBeenCalledWith([mockPanelId], { after: "anchor-1" });
    expect(mocked.$executeRaw).not.toHaveBeenCalled();
  });

  it("缺少锚点时返回 400", async () => {
    const response = await reorder({
      panel_id: mockPanelId,
      project_id: mockProjectId,
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("恰好一种");
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("分镜不存在时返回 404", async () => {
    mocked.panel.findUnique.mockResolvedValue(null);

    const response = await reorder({
      panel_id: mockPanelId,
      project_id: mockProjectId,
      before: "anchor-1",
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("分镜不存在");
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("无权限时返回 403", async () => {
    mocked.panel.findUnique.mockResolvedValue({
      ...mockPanel,
      project: { user_id: "other-user" },
    });

    const response = await reorder({
      panel_id: mockPanelId,
      project_id: mockProjectId,
      before: "anchor-1",
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("无权限操作此分镜");
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("分镜不属于指定项目时返回 400", async () => {
    mocked.panel.findUnique.mockResolvedValue({
      ...mockPanel,
      project_id: "other-project",
    });

    const response = await reorder({
      panel_id: mockPanelId,
      project_id: mockProjectId,
      before: "anchor-1",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("分镜不属于指定项目");
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("未登录时返回 401", async () => {
    mockCookiesGet.mockReturnValue(undefined);

    const response = await reorder({
      panel_id: mockPanelId,
      project_id: mockProjectId,
      after: "anchor-1",
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });

  it("place 抛出的 ApiError 沿用 statusCode", async () => {
    mocked.panel.findUnique.mockResolvedValue(mockPanel);
    mockPlace.mockRejectedValue(new ApiError(400, "ANCHOR_IN_SELECTION", "不能把分镜放到自己前面或后面"));

    const response = await reorder({
      panel_id: mockPanelId,
      project_id: mockProjectId,
      before: mockPanelId,
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("ANCHOR_IN_SELECTION");
    expect(data.error).toBe("不能把分镜放到自己前面或后面");
  });
});
