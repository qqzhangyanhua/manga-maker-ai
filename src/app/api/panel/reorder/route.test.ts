import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PUT } from "./route";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";

// Use vi.hoisted to ensure mocks are available before module imports
const { mockCookiesGet, mockCookies } = vi.hoisted(() => {
  const mockCookiesGet = vi.fn();
  const mockCookies = vi.fn();
  return { mockCookiesGet, mockCookies };
});

// Mock dependencies
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
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

describe("PUT /api/panel/reorder", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock cookies - default to authenticated
    mockCookiesGet.mockReturnValue({ value: "valid-token" });
    mockCookies.mockResolvedValue({
      get: mockCookiesGet,
    });

    // Mock auth verification
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: mockUserId,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully reorder panel forward (向前移动)", async () => {
    // Mock Prisma responses
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPanel
    );
    (prisma.panel.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback) => {
        await callback({
          $executeRaw: vi.fn(),
          panel: {
            update: vi.fn(),
          },
        });
      }
    );
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPanel)
      .mockResolvedValueOnce({ ...mockPanel, panel_order: 1 });

    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 1,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("分镜顺序已更新");
    expect(data.panel.panel_order).toBe(1);
  });

  it("should successfully reorder panel backward (向后移动)", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPanel
    );
    (prisma.panel.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback) => {
        await callback({
          $executeRaw: vi.fn(),
          panel: {
            update: vi.fn(),
          },
        });
      }
    );
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPanel)
      .mockResolvedValueOnce({ ...mockPanel, panel_order: 5 });

    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 5,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return error when panel_id is missing", async () => {
    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_order: 1,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("缺少必需参数");
  });

  it("should return error when new_order is invalid", async () => {
    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 0,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("new_order 必须是大于 0 的整数");
  });

  it("should return error when panel does not exist", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 1,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("分镜不存在");
  });

  it("should return error when user does not have permission", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPanel,
      project: {
        user_id: "other-user",
      },
    });

    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 1,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("无权限操作此分镜");
  });

  it("should return error when new_order exceeds total panels", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPanel
    );
    (prisma.panel.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 10,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("new_order 超出范围");
  });

  it("should return success when order does not change", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPanel
    );

    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 3, // Same as current order
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("顺序未改变");
  });

  it("should return 401 when not authenticated", async () => {
    // Override default mock for this test
    mockCookiesGet.mockReturnValue(undefined);

    const request = new Request("http://localhost/api/panel/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        panel_id: mockPanelId,
        new_order: 1,
        project_id: mockProjectId,
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
  });
});
