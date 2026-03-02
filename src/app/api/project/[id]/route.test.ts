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
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DELETE, GET, PATCH } from "./route";

const authUserId = "3f2dfbe8-2e2f-4487-8d98-2611c87fca20";
const anotherUserId = "f90b4450-1b30-4dc8-97f8-d0520d8dd667";
const projectId = "3f1582a9-2f17-48cb-a8f9-b994005f6d2b";

describe("API /api/project/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "mock-token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: authUserId,
    });
  });

  it("GET 应返回当前用户项目详情", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
      title: "测试项目",
      panels: [],
      script: null,
    });

    const response = await GET(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project.id).toBe(projectId);
    expect(prisma.project.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId },
      })
    );
  });

  it("GET 参数非法时应返回 400", async () => {
    const response = await GET(new Request("http://localhost/api/project/invalid"), {
      params: { id: "invalid-id" },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("项目参数错误");
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it("GET 访问他人项目时应返回 403", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: anotherUserId,
      panels: [],
      script: null,
    });

    const response = await GET(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("无权限访问");
  });

  it("PATCH 空更新体时应返回 400", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
    });

    const request = new Request(`http://localhost/api/project/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, { params: { id: projectId } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("更新项目参数错误");
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("PATCH 成功时应更新项目", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
    });
    (prisma.project.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
      title: "新标题",
      description: null,
      style: null,
      status: "draft",
      cover_image: null,
      panels: [],
      script: null,
    });

    const request = new Request(`http://localhost/api/project/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "  新标题  " }),
    });

    const response = await PATCH(request, { params: { id: projectId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project.title).toBe("新标题");
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId },
        data: expect.objectContaining({
          title: "新标题",
          updated_at: expect.any(Date),
        }),
      })
    );
  });

  it("DELETE 项目不存在时应返回 404", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await DELETE(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("项目不存在");
  });

  it("DELETE 成功时应删除项目", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
    });
    (prisma.project.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
    });

    const response = await DELETE(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("项目已删除");
    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: projectId },
    });
  });
});
