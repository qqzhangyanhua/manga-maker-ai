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
    imagePageVersion: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("API /api/image/page GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "mock-token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: "user-1" });
  });

  it("未登录时应返回 401", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await GET(new Request("http://localhost/api/image/page"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(prisma.imagePageVersion.findMany).not.toHaveBeenCalled();
  });

  it("默认不包含 canvas_schema 字段", async () => {
    (prisma.imagePageVersion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "v-1",
        label: "版本1",
        source_type: "upload",
        status: "completed",
        image_url: "https://example.com/a.png",
        task_id: null,
        project_id: null,
        metadata: null,
        canvas_schema: { objects: [{ id: "o1" }] },
        created_at: new Date("2026-02-01T00:00:00.000Z"),
        updated_at: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
    (prisma.imagePageVersion.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const response = await GET(new Request("http://localhost/api/image/page?page=1&page_size=20"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.versions).toHaveLength(1);
    expect(data.versions[0]).not.toHaveProperty("canvas_schema");
    expect(prisma.imagePageVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "user-1" },
      })
    );
  });

  it("include_schema=true 时应返回 canvas_schema", async () => {
    (prisma.imagePageVersion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "v-2",
        label: "版本2",
        source_type: "optimize",
        status: "pending",
        image_url: null,
        task_id: "task-123",
        project_id: null,
        metadata: null,
        canvas_schema: { objects: [{ id: "o2" }] },
        created_at: new Date("2026-02-02T00:00:00.000Z"),
        updated_at: new Date("2026-02-02T00:00:00.000Z"),
      },
    ]);
    (prisma.imagePageVersion.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const response = await GET(
      new Request("http://localhost/api/image/page?include_schema=true&page=1&page_size=20")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.versions[0].canvas_schema).toEqual({ objects: [{ id: "o2" }] });
  });
});
