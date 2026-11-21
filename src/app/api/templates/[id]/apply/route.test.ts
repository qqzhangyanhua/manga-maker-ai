import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet, mockCookies, mockReplaceChapter, mockPanels } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn(async () => ({ get: mockCookieGet }));
  const mockReplaceChapter = vi.fn();
  const mockPanels = vi.fn(() => ({ replaceChapter: mockReplaceChapter }));
  return { mockCookieGet, mockCookies, mockReplaceChapter, mockPanels };
});

vi.mock("next/headers", () => ({ cookies: mockCookies }));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    story: { findUnique: vi.fn(), create: vi.fn() },
    panelTemplate: { findUnique: vi.fn(), update: vi.fn() },
    panel: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/project", () => ({
  ensureStoryProject: vi.fn(),
  ensureDefaultChapter: vi.fn(),
  panelReadingOrderBy: [{ chapter: { chapter_order: "asc" } }, { panel_order: "asc" }, { id: "asc" }],
}));

vi.mock("@/lib/project/chapter-panels", async () => {
  const actual = await vi.importActual<typeof import("@/lib/project/chapter-panels")>(
    "@/lib/project/chapter-panels",
  );
  return { ...actual, panels: mockPanels };
});

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultChapter, ensureStoryProject } from "@/lib/project";
import { PANEL_WRITE_TX_OPTIONS, panelReadingOrderBy } from "@/lib/project/chapter-panels";
import { POST } from "./route";

const userId = "user-1";
const projectId = "project-1";
const templateId = "template-1";

const tx = {
  panel: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  panelTemplate: { update: vi.fn() },
  $executeRaw: vi.fn(),
};

const mocked = prisma as unknown as {
  story: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  panelTemplate: { findUnique: ReturnType<typeof vi.fn> };
  panel: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function row(
  id: string,
  chapterId: string,
  description: string,
  generatedImage: string | null = null,
  sketchImageUrl: string | null = null,
) {
  return {
    id,
    chapter_id: chapterId,
    panel_order: 1,
    description,
    panel_type: "dialogue",
    importance: "medium",
    dialogue: null,
    camera_angle: null,
    shot_size: null,
    emotion: null,
    prompt_used: null,
    generated_image: generatedImage,
    character_name: null,
    sketch_image_url: sketchImageUrl,
    script_segment_id: "seg-json",
    is_shared: true,
    shared_at: null,
    view_count: 4,
    show_prompt: false,
    segment_id: null,
    visual_prompt: null,
    negative_prompt: null,
    composition_hint: null,
    location_key: null,
    generation_status: null,
    scene_id: null,
    camera_movement: null,
    movement_speed: null,
    movement_direction: null,
    script_start: null,
    script_end: null,
    layout_hint: null,
  };
}

const existing = [
  row("a", "chapter-a", "甲", "http://img/a.png", "http://img/a-sketch.png"),
  row("b", "chapter-a", "乙"),
  row("c", "chapter-b", "丙"),
];

function apply(body: Record<string, unknown>) {
  return POST(
    new Request(`http://localhost/api/templates/${templateId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: { id: templateId } },
  );
}

describe("POST /api/templates/[id]/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplaceChapter.mockReset();
    mockPanels.mockReset();
    mockPanels.mockImplementation(() => ({ replaceChapter: mockReplaceChapter }));
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.story.findUnique.mockResolvedValue({ id: "story-1", title: "故事", user_id: userId });
    mocked.story.create.mockResolvedValue({ id: "story-new", title: "新故事", user_id: userId });
    (ensureStoryProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: projectId });
    (ensureDefaultChapter as ReturnType<typeof vi.fn>).mockResolvedValue("chapter-default");
    mocked.panelTemplate.findUnique.mockResolvedValue({
      id: templateId,
      name: "追逐",
      panel_count: 2,
      usage_count: 0,
      is_public: true,
      is_official: false,
      user_id: "other",
      template_data: {
        panels: [
          { panel_type: "wide", camera_angle: "俯视", shot_size: "远景", importance: null, relative_position: 0 },
          { panel_type: null, camera_angle: null, shot_size: "特写", importance: "high", relative_position: 1 },
        ],
      },
    });
    mocked.panel.findMany.mockResolvedValue(existing);
    tx.panel.findMany.mockResolvedValue(existing);
    tx.panel.create.mockImplementation(async (args: { data: { description: string } }) => ({ id: "created", ...args.data }));
    tx.panel.update.mockResolvedValue({});
    tx.panel.deleteMany.mockResolvedValue({ count: 0 });
    tx.panelTemplate.update.mockResolvedValue({});
    tx.$executeRaw.mockResolvedValue(0);
    mocked.$transaction.mockImplementation(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx));
    mockReplaceChapter.mockImplementation(async (_chapterId: string, fields: unknown[]) => ({
      panels: fields.map((_field, index) => ({ id: `new-${index}`, panelOrder: index + 1 })),
      discarded: { variants: 0, pipelineStates: 0, cast: 0, canvasLinks: 0 },
    }));
  });

  it("插入只替换所在章节，不自己创建分镜或平移编号", async () => {
    const events: string[] = [];
    tx.panel.findMany.mockImplementation(async () => {
      events.push("read");
      return existing;
    });
    tx.$executeRaw.mockImplementation(async () => {
      events.push("lock");
      return 0;
    });

    const response = await apply({ storyId: "story-1", mode: "insert", insertAfterOrder: 1 });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(mockPanels).toHaveBeenCalledWith(projectId, { tx });
    expect(mocked.$transaction).toHaveBeenCalledWith(expect.any(Function), PANEL_WRITE_TX_OPTIONS);
    expect(events).toEqual(["read", "lock", "read"]);
    expect(tx.panel.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: panelReadingOrderBy }));
    expect(mockReplaceChapter).toHaveBeenCalledTimes(1);
    expect(mockReplaceChapter).toHaveBeenCalledWith("chapter-a", [
      expect.objectContaining({
        description: "甲",
        generatedImage: "http://img/a.png",
        sketchImageUrl: "http://img/a-sketch.png",
        scriptSegmentId: "seg-json",
        isShared: true,
        viewCount: 4,
        showPrompt: false,
      }),
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 1", panelType: "wide", cameraAngle: "俯视" }),
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 2", panelType: "medium", importance: "high" }),
      expect.objectContaining({ description: "乙" }),
    ]);
    expect(data.data.panels).toEqual([
      { id: "new-1", panelOrder: 2 },
      { id: "new-2", panelOrder: 3 },
    ]);
    expect(tx.panel.create).not.toHaveBeenCalled();
    expect(tx.panel.update).not.toHaveBeenCalled();
    expect(tx.panel.deleteMany).not.toHaveBeenCalled();
    expect(mocked.panel.create).not.toHaveBeenCalled();
    expect(mocked.panel.update).not.toHaveBeenCalled();
    expect(mocked.panel.deleteMany).not.toHaveBeenCalled();
    expect(tx.panelTemplate.update).toHaveBeenCalledWith({
      where: { id: templateId },
      data: { usage_count: { increment: 1 } },
    });
  });

  it("空项目把模板放进默认章节", async () => {
    tx.panel.findMany.mockResolvedValue([]);

    const response = await apply({ storyId: null, newStoryTitle: "新故事", mode: "insert" });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(mocked.story.create).toHaveBeenCalled();
    expect(ensureDefaultChapter).toHaveBeenCalledWith(tx, projectId);
    expect(mockReplaceChapter).toHaveBeenCalledWith("chapter-default", [
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 1" }),
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 2" }),
    ]);
  });

  it("替换同一章时留下没被选中的格子，不平移别的章节", async () => {
    const response = await apply({
      storyId: "story-1",
      mode: "replace",
      targetPanelIds: ["b"],
    });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(mockReplaceChapter).toHaveBeenCalledTimes(1);
    expect(mockReplaceChapter).toHaveBeenCalledWith("chapter-a", [
      expect.objectContaining({
        description: "甲",
        generatedImage: "http://img/a.png",
        sketchImageUrl: "http://img/a-sketch.png",
      }),
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 1" }),
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 2" }),
    ]);
    expect(tx.panel.deleteMany).not.toHaveBeenCalled();
    expect(tx.panel.update).not.toHaveBeenCalled();
  });

  it("跨章节替换直接拒绝", async () => {
    const response = await apply({
      storyId: "story-1",
      mode: "replace",
      targetPanelIds: ["a", "c"],
    });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(400);
    expect(data.success).toBe(false);
    expect(mockReplaceChapter).not.toHaveBeenCalled();
    expect(tx.panel.deleteMany).not.toHaveBeenCalled();
  });

  it("模板数据为空时返回格式错误，不替换分镜", async () => {
    mocked.panelTemplate.findUnique.mockResolvedValue({
      id: templateId,
      name: "追逐",
      panel_count: 0,
      usage_count: 0,
      is_public: true,
      is_official: false,
      user_id: "other",
      template_data: null,
    });

    const response = await apply({ storyId: "story-1", mode: "insert" });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toMatchObject({ success: false, error: "模板数据格式错误" });
    expect(mockReplaceChapter).not.toHaveBeenCalled();
  });

  it("锁之后读到空项目时，插入沿用已锁章节，不再拿项目锁", async () => {
    const events: string[] = [];
    tx.panel.findMany
      .mockImplementationOnce(async () => {
        events.push("read");
        return existing;
      })
      .mockImplementationOnce(async () => {
        events.push("read");
        return [];
      });
    tx.$executeRaw.mockImplementation(async () => {
      events.push("lock");
      return 0;
    });
    (ensureDefaultChapter as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      events.push("project-lock");
      return "chapter-default";
    });

    const response = await apply({ storyId: "story-1", mode: "insert", insertAfterOrder: 1 });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(events).toEqual(["read", "lock", "read"]);
    expect(mockReplaceChapter).toHaveBeenCalledWith("chapter-a", [
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 1" }),
      expect.objectContaining({ description: "从模板「追逐」生成的分镜 2" }),
    ]);
  });

  it("锁之后读到空项目时，替换仍拒绝缺失目标，不拿项目锁", async () => {
    tx.panel.findMany.mockResolvedValueOnce(existing).mockResolvedValueOnce([]);

    const response = await apply({
      storyId: "story-1",
      mode: "replace",
      targetPanelIds: ["b"],
    });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(404);
    expect(ensureDefaultChapter).not.toHaveBeenCalled();
    expect(mockReplaceChapter).not.toHaveBeenCalled();
  });
});
