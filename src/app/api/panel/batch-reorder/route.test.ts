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
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/project/chapter-panels", () => ({
  panels: mockPanels,
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PUT } from "./route";

const userId = "user-1";
const projectId = "project-1";

const mocked = prisma as unknown as {
  panel: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  $executeRaw: ReturnType<typeof vi.fn>;
  $transaction: ReturnType<typeof vi.fn>;
};

function batchReorder(body: Record<string, unknown>) {
  return PUT(
    new Request("http://localhost/api/panel/batch-reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function owned(id: string) {
  return { id, project_id: projectId, project: { user_id: userId } };
}

describe("PUT /api/panel/batch-reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGet.mockReturnValue({ value: "token" });
    mockCookies.mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
  });

  it("按请求顺序调用 place，不执行 raw SQL", async () => {
    mocked.panel.findMany.mockResolvedValue([owned("a"), owned("b")]);
    mockPlace.mockResolvedValue([
      { id: "b", chapterId: "chapter-1", panelOrder: 2 },
      { id: "a", chapterId: "chapter-1", panelOrder: 3 },
    ]);

    const response = await batchReorder({
      panel_ids: ["b", "a"],
      project_id: projectId,
      before: "c",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("成功移动 2 个分镜");
    expect(data.placed).toHaveLength(2);
    expect(mockPanels).toHaveBeenCalledWith(projectId);
    expect(mockPlace).toHaveBeenCalledWith(["b", "a"], { before: "c" });
    expect(mocked.$executeRaw).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
    expect(mocked.panel.update).not.toHaveBeenCalled();
  });

  it("缺少锚点时返回 400", async () => {
    const response = await batchReorder({
      panel_ids: ["a"],
      project_id: projectId,
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(mockPlace).not.toHaveBeenCalled();
    expect(data.error).toContain("恰好一种");
  });

  it("有分镜不在项目里时返回 404", async () => {
    mocked.panel.findMany.mockResolvedValue([owned("a")]);

    const response = await batchReorder({
      panel_ids: ["a", "missing"],
      project_id: projectId,
      after: "c",
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("部分分镜不存在或不属于指定项目");
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("不是所有者时返回 403", async () => {
    mocked.panel.findMany.mockResolvedValue([
      { id: "a", project_id: projectId, project: { user_id: "other" } },
    ]);

    const response = await batchReorder({
      panel_ids: ["a"],
      project_id: projectId,
      after: "c",
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("无权限操作");
    expect(mockPlace).not.toHaveBeenCalled();
  });

  it("未登录时返回 401", async () => {
    mockCookiesGet.mockReturnValue(undefined);

    const response = await batchReorder({
      panel_ids: ["a"],
      project_id: projectId,
      after: "c",
    });

    expect(response.status).toBe(401);
    expect(mockPlace).not.toHaveBeenCalled();
  });
});
