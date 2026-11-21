import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet, remove, panelsMock } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const remove = vi.fn();
  const panelsMock = vi.fn(() => ({ remove }));
  return { mockCookieGet, remove, panelsMock };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockCookieGet }),
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/project/chapter-panels", () => ({
  panels: panelsMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const userId = "user-1";
const projectId = "project-1";

const mocked = prisma as unknown as {
  panel: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function batchDelete(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/panel/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function ownedPanel(id: string, panelOrder: number) {
  return {
    id,
    project_id: projectId,
    panel_order: panelOrder,
    project: { id: projectId, user_id: userId },
  };
}

describe("POST /api/panel/batch-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
  });

  it("成功时调用 remove，且不重排剩余分镜", async () => {
    const discarded = { variants: 1, pipelineStates: 1, cast: 2, canvasLinks: 0 };
    mocked.panel.findMany.mockResolvedValue([ownedPanel("p1", 1), ownedPanel("p2", 2)]);
    remove.mockResolvedValue(discarded);
    mocked.panel.count.mockResolvedValue(3);

    const response = await batchDelete({ panelIds: ["p1", "p2"] });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(panelsMock).toHaveBeenCalledWith(projectId);
    expect(remove).toHaveBeenCalledWith(["p1", "p2"]);
    expect(mocked.panel.count).toHaveBeenCalledWith({ where: { project_id: projectId } });
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(mocked.panel.count.mock.invocationCallOrder[0]);
    expect(mocked.panel.update).not.toHaveBeenCalled();
    expect(mocked.panel.updateMany).not.toHaveBeenCalled();
    expect(mocked.panel.deleteMany).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
    expect(data).toEqual({
      success: true,
      data: { deletedCount: 2, remainingCount: 3, discarded },
      message: "成功删除 2 个分镜",
    });
  });

  it("id 缺失时整次不删", async () => {
    mocked.panel.findMany.mockResolvedValue([ownedPanel("p1", 1)]);

    const response = await batchDelete({ panelIds: ["p1", "missing"] });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("未找到要删除的分镜");
    expect(remove).not.toHaveBeenCalled();
    expect(mocked.panel.update).not.toHaveBeenCalled();
  });

  it("remove 抛出的 ApiError 使用对应状态码", async () => {
    mocked.panel.findMany.mockResolvedValue([ownedPanel("p1", 1)]);
    remove.mockRejectedValue(new ApiError(409, "CONFLICT", "章节正在写入"));

    const response = await batchDelete({ panelIds: ["p1"] });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data).toEqual({ error: "章节正在写入", code: "CONFLICT" });
  });
});
