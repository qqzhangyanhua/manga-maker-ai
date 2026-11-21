import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies, mockCookieGet, mockReplaceChapter, mockAdd, mockPanels } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet });
  const mockReplaceChapter = vi.fn();
  const mockAdd = vi.fn();
  const mockPanels = vi.fn(() => ({
    replaceChapter: mockReplaceChapter,
    add: mockAdd,
  }));
  return { mockCookies, mockCookieGet, mockReplaceChapter, mockAdd, mockPanels };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/panel-generator", () => ({
  generatePanelsFromChapter: vi.fn(),
}));

vi.mock("@/lib/usage", () => ({
  assertAndIncrementUsage: vi.fn(),
}));

vi.mock("@/lib/generation-log", () => ({
  recordGenerationLog: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    chapter: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    panel: { deleteMany: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/project/chapter-panels", async () => {
  const actual = await vi.importActual<typeof import("@/lib/project/chapter-panels")>(
    "@/lib/project/chapter-panels",
  );
  return {
    ...actual,
    panels: mockPanels,
  };
});

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordGenerationLog } from "@/lib/generation-log";
import { generatePanelsFromChapter } from "@/lib/panel-generator";
import { panels } from "@/lib/project/chapter-panels";
import { assertAndIncrementUsage } from "@/lib/usage";
import { POST } from "./route";

const userId = "user-1";
const chapterId = "chapter-1";
const projectId = "project-1";

const generatedPanels = [
  {
    panel_order: 1,
    description: "远景",
    visual_prompt: "wide street",
    dialogue: "你好",
    panel_type: "wide",
    importance: "high",
    camera_angle: "平视",
    shot_size: "远景",
    camera_movement: "static",
    movement_speed: "slow",
    movement_direction: "向前",
  },
  {
    panel_order: 4,
    description: "特写",
    visual_prompt: "",
    dialogue: "",
    panel_type: "closeup",
    importance: "low",
  },
];

const expectedFields = [
  {
    description: "远景",
    visualPrompt: "wide street",
    dialogue: "你好",
    panelType: "wide",
    importance: "high",
    cameraAngle: "平视",
    shotSize: "远景",
    cameraMovement: "static",
    movementSpeed: "slow",
    movementDirection: "向前",
  },
  {
    description: "特写",
    visualPrompt: "",
    dialogue: null,
    panelType: "closeup",
    importance: "low",
    cameraAngle: null,
    shotSize: null,
    cameraMovement: null,
    movementSpeed: null,
    movementDirection: null,
  },
];

const mocked = prisma as unknown as {
  chapter: { findUnique: ReturnType<typeof vi.fn> };
  project: { findUnique: ReturnType<typeof vi.fn> };
  panel: {
    deleteMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

let order: string[] = [];

function generate(body: Record<string, unknown>) {
  return POST(
    new Request(`http://localhost/api/chapter/${chapterId}/generate-panels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: chapterId }) },
  );
}

function ownChapter() {
  mocked.chapter.findUnique.mockResolvedValue({
    id: chapterId,
    story_id: "story-1",
    project_id: projectId,
    title: "第一章",
    summary: "有梗概",
    project: { user_id: userId, title: "故事", genre: "daily" },
  });
  mocked.project.findUnique.mockResolvedValue({ user_id: userId, story_id: "story-1" });
}

describe("POST /api/chapter/[id]/generate-panels 覆盖与追加", () => {
  beforeEach(() => {
    order = [];
    vi.clearAllMocks();
    mockReplaceChapter.mockReset();
    mockAdd.mockReset();
    mockPanels.mockReset();
    mockPanels.mockImplementation(() => ({
      replaceChapter: mockReplaceChapter,
      add: mockAdd,
    }));
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    vi.mocked(assertAndIncrementUsage).mockReset();
    vi.mocked(generatePanelsFromChapter).mockReset();
    vi.mocked(recordGenerationLog).mockReset();
    mocked.chapter.findUnique.mockReset();
    mocked.project.findUnique.mockReset();
    mocked.panel.deleteMany.mockReset();
    mocked.panel.findMany.mockReset();
    mocked.panel.create.mockReset();
    mocked.$transaction.mockReset();

    vi.mocked(assertAndIncrementUsage).mockImplementation(async () => {
      order.push("quota");
    });
    vi.mocked(recordGenerationLog).mockImplementation(async () => {
      order.push("log");
    });
  });

  it("overwrite 调用 replaceChapter，不在事务外 deleteMany，配额在生成之前", async () => {
    ownChapter();
    vi.mocked(generatePanelsFromChapter).mockImplementation(async () => {
      order.push("generate");
      return generatedPanels;
    });
    mockReplaceChapter.mockImplementation(async () => {
      order.push("replace");
      return {
        panels: [
          { id: "panel-a", panelOrder: 1 },
          { id: "panel-b", panelOrder: 2 },
        ],
      };
    });
    mocked.panel.findMany.mockImplementation(async () => {
      order.push("load");
      return [
        { id: "panel-b", description: "特写" },
        { id: "panel-a", description: "远景" },
      ];
    });

    const response = await generate({ project_id: projectId, panel_count: 2, overwrite: true });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(order).toEqual(["quota", "generate", "replace", "load", "log"]);
    expect(panels).toHaveBeenCalledWith(projectId);
    expect(mockReplaceChapter).toHaveBeenCalledWith(chapterId, expectedFields);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mocked.panel.deleteMany).not.toHaveBeenCalled();
    expect(mocked.panel.create).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
    expect(mocked.panel.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["panel-a", "panel-b"] } },
    });
    expect(data.panels).toEqual([
      { id: "panel-a", description: "远景" },
      { id: "panel-b", description: "特写" },
    ]);
    expect(recordGenerationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        responsePayload: {
          panels_generated: 2,
          panel_ids: ["panel-a", "panel-b"],
        },
      }),
    );
  });

  it("追加调用 add，不调用 replaceChapter，也不自己算 panel_order", async () => {
    ownChapter();
    vi.mocked(generatePanelsFromChapter).mockImplementation(async () => {
      order.push("generate");
      return generatedPanels;
    });
    mockAdd.mockImplementation(async () => {
      order.push("add");
      return [
        { id: "panel-a", panelOrder: 5 },
        { id: "panel-b", panelOrder: 6 },
      ];
    });
    mocked.panel.findMany.mockImplementation(async () => {
      order.push("load");
      return [
        { id: "panel-b", description: "特写" },
        { id: "panel-a", description: "远景" },
      ];
    });

    const response = await generate({ project_id: projectId, panel_count: 2 });
    const data = await response.json();

    expect(response.status, JSON.stringify(data)).toBe(200);
    expect(order).toEqual(["quota", "generate", "add", "load", "log"]);
    expect(panels).toHaveBeenCalledWith(projectId);
    expect(mockAdd).toHaveBeenCalledWith(expectedFields, { chapter: chapterId });
    expect(mockReplaceChapter).not.toHaveBeenCalled();
    expect(mocked.panel.deleteMany).not.toHaveBeenCalled();
    expect(mocked.panel.create).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
    expect(data.panels.map((panel: { id: string }) => panel.id)).toEqual(["panel-a", "panel-b"]);
  });

  it("生成失败时不删除旧分镜", async () => {
    ownChapter();
    vi.mocked(generatePanelsFromChapter).mockImplementation(async () => {
      order.push("generate");
      throw new Error("模型失败");
    });

    const response = await generate({ project_id: projectId, overwrite: true });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("模型失败");
    expect(order).toEqual(["quota", "generate", "log"]);
    expect(mockReplaceChapter).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mocked.panel.deleteMany).not.toHaveBeenCalled();
    expect(mocked.panel.findMany).not.toHaveBeenCalled();
  });
});
