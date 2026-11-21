import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet, mockCookies, mockReplaceChapter, mockPanels, mockRestoreSegments } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn(async () => ({ get: mockCookieGet }));
  const mockReplaceChapter = vi.fn();
  const mockPanels = vi.fn(() => ({ replaceChapter: mockReplaceChapter }));
  const mockRestoreSegments = vi.fn();
  return { mockCookieGet, mockCookies, mockReplaceChapter, mockPanels, mockRestoreSegments };
});

vi.mock("next/headers", () => ({ cookies: mockCookies }));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  Prisma: {},
  prisma: {
    project: { findUnique: vi.fn(), update: vi.fn() },
    projectVersion: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    chapter: { findMany: vi.fn() },
    panel: { deleteMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn() },
    storyScript: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/project", () => ({
  ensureDefaultChapter: vi.fn(),
  panelReadingOrderBy: [],
}));

vi.mock("@/lib/script-segment", () => ({
  readMigratedPanelSegmentIds: vi.fn(),
  readProjectChapterSegments: vi.fn(),
  readSnapshotSegments: vi.fn((segments: unknown) => (Array.isArray(segments) ? segments : [])),
  restoreProjectChapterSegments: mockRestoreSegments,
  withMigratedSegmentIds: vi.fn((panels: unknown) => panels),
}));

vi.mock("@/lib/project/chapter-panels", async () => {
  const actual = await vi.importActual<typeof import("@/lib/project/chapter-panels")>(
    "@/lib/project/chapter-panels",
  );
  return { ...actual, panels: mockPanels };
});

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultChapter } from "@/lib/project";
import { PANEL_WRITE_TX_OPTIONS } from "@/lib/project/chapter-panels";
import { POST } from "./route";

const userId = "user-1";
const projectId = "project-1";

const tx = {
  project: { update: vi.fn() },
  chapter: { findMany: vi.fn() },
  storyScript: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  panel: { deleteMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn() },
  $executeRaw: vi.fn(async (_query: TemplateStringsArray, chapterId: string) => {
    locks.push(chapterId);
    return 0;
  }),
};

const mocked = prisma as unknown as {
  project: { findUnique: ReturnType<typeof vi.fn> };
  projectVersion: { findUnique: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
  panel: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
};

let transactionRejected = false;
let callOrder: string[] = [];
let locks: string[] = [];

function restore(body: Record<string, unknown>) {
  return POST(
    new Request(`http://localhost/api/projects/${projectId}/versions/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: { id: projectId } },
  );
}

function versionWith(panels: Record<string, unknown>[]) {
  return {
    id: "version-1",
    project_id: projectId,
    version_number: 3,
    label: null,
    version_data: {
      project: { title: "旧标题", description: "旧简介", style: "manga" },
      panels,
      script: { content: "正文", segments: [] },
    },
  };
}

describe("POST /api/projects/[id]/versions/restore", () => {
  beforeEach(() => {
    transactionRejected = false;
    callOrder = [];
    locks = [];
    vi.clearAllMocks();
    mockReplaceChapter.mockReset();
    mockPanels.mockReset();
    mockPanels.mockImplementation(() => ({ replaceChapter: mockReplaceChapter }));
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.project.findUnique.mockResolvedValue({ id: projectId, user_id: userId, title: "现在" });
    mocked.$transaction.mockImplementation(async (fn: (inner: typeof tx) => Promise<void>) => {
      try {
        return await fn(tx);
      } catch (error) {
        transactionRejected = true;
        throw error;
      }
    });
    tx.chapter.findMany.mockResolvedValue([{ id: "chapter-a" }, { id: "chapter-b" }]);
    tx.storyScript.findUnique.mockResolvedValue(null);
    tx.storyScript.create.mockResolvedValue({ id: "script-1" });
    mockRestoreSegments.mockImplementation(async () => {
      callOrder.push("segments");
      return [];
    });
    mockReplaceChapter.mockImplementation(async (chapterId: string, fields: { description?: string }[]) => {
      const label = fields.length === 0 ? "clear" : "fill";
      callOrder.push(`${label}:${chapterId}:${fields.map((field) => field.description ?? "").join(",")}`);
      return { panels: [], discarded: { variants: 0, pipelineStates: 0, cast: 0, canvasLinks: 0 } };
    });
    (ensureDefaultChapter as ReturnType<typeof vi.fn>).mockResolvedValue("chapter-default");
  });

  it("按章节重编旧的项目编号，入口自己不删建分镜", async () => {
    mocked.projectVersion.findUnique.mockResolvedValue(versionWith([
      { chapter_id: "chapter-a", panel_order: 10, description: "甲", panel_type: "wide", generated_image: "http://img/a.png", character_id: "lead" },
      { chapter_id: "chapter-b", panel_order: 11, description: "乙", panel_type: "medium" },
      { chapter_id: "chapter-a", panel_order: 30, description: "丙", panel_type: "closeup" },
      { chapter_id: "chapter-b", panel_order: 12, description: "丁", panel_type: "dialogue" },
    ]));

    const response = await restore({ versionId: "version-1", createBackup: false });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(mockPanels).toHaveBeenCalledWith(projectId, { tx });
    expect(mocked.$transaction).toHaveBeenCalledWith(expect.any(Function), PANEL_WRITE_TX_OPTIONS);
    expect(callOrder).toEqual([
      "clear:chapter-a:",
      "clear:chapter-b:",
      "segments",
      "fill:chapter-a:甲,丙",
      "fill:chapter-b:乙,丁",
    ]);
    const filled = mockReplaceChapter.mock.calls.find((call) => call[0] === "chapter-a" && call[1].length > 0);
    expect(filled?.[1][0]).toMatchObject({
      description: "甲",
      generatedImage: "http://img/a.png",
      panelType: "wide",
    });
    expect(filled?.[1][0]).not.toHaveProperty("character_id");
    expect(filled?.[1][0]).not.toHaveProperty("characterId");
    expect(tx.panel.deleteMany).not.toHaveBeenCalled();
    expect(tx.panel.create).not.toHaveBeenCalled();
    expect(tx.panel.createMany).not.toHaveBeenCalled();
    expect(tx.panel.update).not.toHaveBeenCalled();
    expect(mocked.panel.deleteMany).not.toHaveBeenCalled();
    expect(mocked.panel.createMany).not.toHaveBeenCalled();
    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: projectId },
      data: { title: "旧标题", description: "旧简介", style: "manga" },
    });
  });

  it("未知章节归到已有的第一章，不另建默认章节", async () => {
    tx.chapter.findMany.mockResolvedValue([{ id: "chapter-a" }]);
    mocked.projectVersion.findUnique.mockResolvedValue(versionWith([
      { chapter_id: "gone", panel_order: 4, description: "外来", panel_type: "wide" },
    ]));

    const response = await restore({ versionId: "version-1", createBackup: false });

    expect(response.status).toBe(200);
    expect(ensureDefaultChapter).not.toHaveBeenCalled();
    expect(callOrder).toEqual(["clear:chapter-a:", "segments", "fill:chapter-a:外来"]);
  });

  it("任一章节替换失败时整个恢复回滚", async () => {
    mocked.projectVersion.findUnique.mockResolvedValue(versionWith([
      { chapter_id: "chapter-a", panel_order: 1, description: "甲" },
      { chapter_id: "chapter-b", panel_order: 2, description: "乙" },
    ]));
    mockReplaceChapter.mockImplementation(async (chapterId: string, fields: { description?: string }[]) => {
      callOrder.push(`${fields.length === 0 ? "clear" : "fill"}:${chapterId}`);
      if (chapterId === "chapter-b" && fields.length > 0) {
        throw new Error("第二章写入失败");
      }
      return { panels: [], discarded: { variants: 0, pipelineStates: 0, cast: 0, canvasLinks: 0 } };
    });

    const response = await restore({ versionId: "version-1", createBackup: false });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(500);
    expect(transactionRejected).toBe(true);
    expect(callOrder).toEqual(["clear:chapter-a", "clear:chapter-b", "segments", "fill:chapter-a", "fill:chapter-b"]);
    expect(tx.panel.createMany).not.toHaveBeenCalled();
    expect(data.success).toBe(false);
  });

  it("恢复前按章节 id 排序加锁，不是章节列表顺序", async () => {
    tx.chapter.findMany.mockResolvedValue([{ id: "chapter-b" }, { id: "chapter-a" }]);
    mocked.projectVersion.findUnique.mockResolvedValue(versionWith([
      { chapter_id: "chapter-b", panel_order: 2, description: "乙" },
      { chapter_id: "chapter-a", panel_order: 1, description: "甲" },
    ]));

    const response = await restore({ versionId: "version-1", createBackup: false });

    expect(response.status).toBe(200);
    expect(locks.slice(0, 2)).toEqual(["chapter-a", "chapter-b"]);
    expect(callOrder[0]).toBe("clear:chapter-b:");
    expect(callOrder[1]).toBe("clear:chapter-a:");
  });
});
