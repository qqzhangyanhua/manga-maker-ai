import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies, mockCookieGet } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet });
  return { mockCookies, mockCookieGet };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    workflow: {
      findMany: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("API /api/workflow GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "mock-token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: "user-1",
    });
  });

  it("未登录时应返回 401", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await GET(new Request("http://localhost/api/workflow"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(prisma.workflow.findMany).not.toHaveBeenCalled();
  });

  it("token 无效时应返回 401", async () => {
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const response = await GET(new Request("http://localhost/api/workflow"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("无效的token");
    expect(prisma.workflow.findMany).not.toHaveBeenCalled();
  });

  it("成功时应按条件查询并返回 workflows", async () => {
    (prisma.workflow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "wf-1",
        status: "running",
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/workflow?status=running&limit=50")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
    expect(data.workflows).toHaveLength(1);
    expect(prisma.workflow.findMany).toHaveBeenCalledWith({
      where: { user_id: "user-1", status: "running" },
      orderBy: { created_at: "desc" },
      take: 50,
    });
  });
});
