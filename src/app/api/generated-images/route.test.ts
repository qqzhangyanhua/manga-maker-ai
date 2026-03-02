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

vi.mock("@/lib/db", () => ({
  prisma: {
    generatedImage: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    character: {
      findFirst: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("API /api/generated-images GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "mock-token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: "user-1",
    });
  });

  it("未登录时应返回 401", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await GET(new NextRequest("http://localhost/api/generated-images"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(prisma.generatedImage.findMany).not.toHaveBeenCalled();
  });

  it("无效 token 时应返回 401", async () => {
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const response = await GET(new NextRequest("http://localhost/api/generated-images"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("无效的token");
    expect(prisma.generatedImage.findMany).not.toHaveBeenCalled();
  });

  it("应按过滤条件查询并返回分页数据", async () => {
    (prisma.generatedImage.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.generatedImage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "img-1",
        image_url: "https://example.com/1.png",
        prompt: "hero portrait",
      },
    ]);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/generated-images?page=2&limit=20&style=manga&source_type=panel&search=hero"
      )
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.images).toHaveLength(1);
    expect(data.data.pagination.page).toBe(2);
    expect(data.data.pagination.total).toBe(1);

    expect(prisma.generatedImage.count).toHaveBeenCalledWith({
      where: {
        user_id: "user-1",
        style: "manga",
        source_type: "panel",
        prompt: {
          contains: "hero",
          mode: "insensitive",
        },
      },
    });

    expect(prisma.generatedImage.findMany).toHaveBeenCalledWith({
      where: {
        user_id: "user-1",
        style: "manga",
        source_type: "panel",
        prompt: {
          contains: "hero",
          mode: "insensitive",
        },
      },
      orderBy: { created_at: "desc" },
      skip: 20,
      take: 20,
    });
  });
});
