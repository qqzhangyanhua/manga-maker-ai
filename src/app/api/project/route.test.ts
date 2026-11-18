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
    $transaction: vi.fn(),
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    story: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DELETE, GET, POST } from "./route";

const authUserId = "3f2dfbe8-2e2f-4487-8d98-2611c87fca20";
const storyId = "39bd5294-8191-4089-9bfe-bfa7d7f7ee2a";
const projectId = "3f1582a9-2f17-48cb-a8f9-b994005f6d2b";

describe("API /api/project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "mock-token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: authUserId,
    });
  });

  it("GET 应返回当前用户项目列表", async () => {
    (prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: projectId, user_id: authUserId, title: "测试项目" },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.projects).toHaveLength(1);
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: authUserId },
      })
    );
  });

  it("POST 参数非法时应返回 400", async () => {
    const request = new Request("http://localhost/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "   ",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("创建项目参数错误");
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it("POST 关联其他用户故事时应返回 403", async () => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: storyId,
      user_id: "f90b4450-1b30-4dc8-97f8-d0520d8dd667",
    });

    const request = new Request("http://localhost/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "测试项目",
        story_id: storyId,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("无权关联该故事");
  });

  it("POST 故事已有项目时应返回该项目，不再新建", async () => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: storyId,
      user_id: authUserId,
    });
    (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      story_id: storyId,
    });

    const request = new Request("http://localhost/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "测试项目", story_id: storyId }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.project.id).toBe(projectId);
    expect(prisma.project.create).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("POST 故事还没有项目时应新建主项目并写入请求字段", async () => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: storyId, user_id: authUserId })
      .mockResolvedValueOnce({
        user_id: authUserId,
        title: "故事标题",
        genre: "daily",
        premise: "梗概",
        outline: {},
        template_id: null,
        comic_style_id: null,
        style_reference_image: null,
        is_serialized: false,
        serial_status: null,
        is_sample: false,
        sample_category: null,
        source_type: null,
        source_novel_id: null,
      });
    (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: projectId });
    (prisma.project.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      title: "测试项目",
    });

    const request = new Request("http://localhost/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "测试项目", story_id: storyId }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.project.id).toBe(projectId);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ story_id: storyId, genre: "daily", premise: "梗概" }),
    });
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: projectId },
      data: expect.objectContaining({ title: "测试项目", status: "draft" }),
    });
  });

  it("DELETE 缺少 id 参数时应返回 400", async () => {
    const request = new Request("http://localhost/api/project", {
      method: "DELETE",
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("删除项目参数错误");
  });

  it("DELETE 成功时应删除项目", async () => {
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
    });
    (prisma.project.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
    });

    const request = new Request(`http://localhost/api/project?id=${projectId}`, {
      method: "DELETE",
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("项目已删除");
    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: projectId },
    });
    expect(prisma.story.delete).not.toHaveBeenCalled();
  });

  it("DELETE 故事主项目时连同故事一起删除", async () => {
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
      story_id: storyId,
    });

    const response = await DELETE(
      new Request(`http://localhost/api/project?id=${projectId}`, { method: "DELETE" })
    );

    expect(response.status).toBe(200);
    expect(prisma.story.delete).toHaveBeenCalledWith({ where: { id: storyId } });
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: projectId } });
  });
});
