import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

vi.mock("@/lib/templates", () => ({
  ensureOfficialTemplatesSeed: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panelTemplate: {
      findMany: vi.fn(),
    },
    templateLike: {
      findMany: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureOfficialTemplatesSeed } from "@/lib/templates";
import { GET } from "./route";

describe("API /api/templates GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
  });

  it("type=my 未登录时应返回 401", async () => {
    const response = await GET(new NextRequest("http://localhost/api/templates?type=my"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("需要登录");
    expect(ensureOfficialTemplatesSeed).toHaveBeenCalledTimes(1);
    expect(prisma.panelTemplate.findMany).not.toHaveBeenCalled();
  });

  it("type=official 应返回官方模板并使用官方过滤条件", async () => {
    (prisma.panelTemplate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "tpl-1",
        user_id: null,
        name: "官方模板 A",
        description: null,
        panel_count: 4,
        template_data: { meta: { category: "four" } },
        tags: ["official"],
        is_public: true,
        is_official: true,
        likes_count: 0,
        usage_count: 10,
        thumbnail_url: null,
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-02T00:00:00.000Z"),
        user: null,
      },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/templates?type=official&limit=50")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.templates).toHaveLength(1);
    expect(data.data.pagination.total).toBe(1);
    expect(prisma.panelTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { is_official: true },
        take: 500,
      })
    );
    expect(prisma.templateLike.findMany).not.toHaveBeenCalled();
  });

  it("登录态请求应返回 likedTemplateIds", async () => {
    mockCookieGet.mockReturnValue({ value: "mock-token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: "user-1",
    });
    (prisma.panelTemplate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "tpl-2",
        user_id: "user-1",
        name: "我的模板",
        description: null,
        panel_count: 3,
        template_data: {},
        tags: [],
        is_public: false,
        is_official: false,
        likes_count: 0,
        usage_count: 1,
        thumbnail_url: null,
        created_at: new Date("2026-01-03T00:00:00.000Z"),
        updated_at: new Date("2026-01-03T00:00:00.000Z"),
        user: { id: "user-1", name: "User", image: null },
      },
    ]);
    (prisma.templateLike.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { template_id: "tpl-2" },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/templates"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.likedTemplateIds).toEqual(["tpl-2"]);
    expect(prisma.templateLike.findMany).toHaveBeenCalledWith({
      where: { user_id: "user-1" },
      select: { template_id: true },
    });
  });
});
