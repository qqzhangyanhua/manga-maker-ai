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
    storyScript: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    chapter: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    panel: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    scriptSegment: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/project", () => ({
  deleteProjectWithStory: vi.fn(),
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteProjectWithStory } from "@/lib/project";
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
    (prisma.storyScript.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.chapter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.panel.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.panel.update as ReturnType<typeof vi.fn>).mockReset();
    (prisma.scriptSegment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.scriptSegment.create as ReturnType<typeof vi.fn>).mockReset();
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

  it("GET 分镜面板读到章节上的剧本片段，不读项目级 JSON", async () => {
    const chapterId = "22222222-2222-4222-8222-222222222221";
    const segmentId = "44444444-4444-4444-8444-444444444444";
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
      title: "测试项目",
      panels: [],
      script: {
        id: "script-1",
        content: "全文",
        segments: [{ id: "seg_1", text: "JSON里的名单", start: 0, end: 2 }],
      },
    });
    (prisma.storyScript.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      project_id: projectId,
      content: "全文",
      segments: [],
    });
    (prisma.chapter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: chapterId, chapter_order: 1, created_at: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    (prisma.scriptSegment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: segmentId,
        chapter_id: chapterId,
        segment_order: 1,
        content: "章节上的雨夜",
        source_text_start: 0,
        source_text_end: 6,
      },
    ]);

    const response = await GET(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.project.script.content).toBe("全文");
    expect(data.project.script.segments).toEqual([
      { id: segmentId, text: "章节上的雨夜", start: 0, end: 6 },
    ]);
  });

  it("GET 迁移之后，分镜指向新的章节片段", async () => {
    const chapterId = "22222222-2222-4222-8222-222222222221";
    const panelId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
    const createdId = "55555555-5555-4555-8555-555555555551";
    const panelRow = {
      id: panelId,
      chapter_id: chapterId,
      script_segment_id: "seg_1",
      segment_id: null as string | null,
    };
    const createdRows: Array<{
      id: string;
      chapter_id: string;
      segment_order: number;
      content: string;
      source_text_start: number;
      source_text_end: number;
    }> = [];
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
      title: "测试项目",
      panels: [{ ...panelRow, panel_order: 1, description: "雨夜" }],
      script: {
        id: "script-1",
        content: "全文",
        segments: [{ id: "seg_1", text: "雨夜", start: 0, end: 4 }],
      },
    });
    (prisma.storyScript.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      project_id: projectId,
      content: "全文",
      segments: [{ id: "seg_1", text: "雨夜", start: 0, end: 4 }],
    });
    (prisma.chapter.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: chapterId, chapter_order: 1, created_at: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    (prisma.panel.findMany as ReturnType<typeof vi.fn>).mockImplementation(async () => [{ ...panelRow }]);
    (prisma.panel.update as ReturnType<typeof vi.fn>).mockImplementation(async ({ data }: { data: { segment_id: string } }) => {
      panelRow.segment_id = data.segment_id;
      return panelRow;
    });
    (prisma.scriptSegment.findMany as ReturnType<typeof vi.fn>).mockImplementation(async () => createdRows.map((row) => ({ ...row })));
    (prisma.scriptSegment.create as ReturnType<typeof vi.fn>).mockImplementation(async ({ data }: { data: {
      chapter_id: string;
      segment_order: number;
      content: string;
      source_text_start: number;
      source_text_end: number;
    } }) => {
      const created = { id: createdId, ...data };
      createdRows.push(created);
      return created;
    });

    const response = await GET(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.project.panels[0].segment_id).toBe(createdId);
    expect(data.project.script.segments).toEqual([
      { id: createdId, text: "雨夜", start: 0, end: 4 },
    ]);
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

  it("DELETE 成功时应删除项目（含故事主项目的故事）", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: authUserId,
    });

    const response = await DELETE(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("项目已删除");
    expect(deleteProjectWithStory).toHaveBeenCalledWith(prisma, projectId);
  });

  it("DELETE 他人项目时应返回 403 且不删除", async () => {
    (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: projectId,
      user_id: anotherUserId,
    });

    const response = await DELETE(new Request(`http://localhost/api/project/${projectId}`), {
      params: { id: projectId },
    });

    expect(response.status).toBe(403);
    expect(deleteProjectWithStory).not.toHaveBeenCalled();
  });
});
