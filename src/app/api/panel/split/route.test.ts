import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet, panelsMock } = vi.hoisted(() => ({
  mockCookieGet: vi.fn(),
  panelsMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockCookieGet }),
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/llm-provider", () => ({
  callChatCompletionStreamByType: vi.fn(),
}));

vi.mock("@/lib/script-segment", () => ({
  migrateLegacyJsonSegments: vi.fn().mockResolvedValue(undefined),
  readMigratedPanelSegmentIds: vi.fn(),
}));

vi.mock("@/lib/project/chapter-panels", () => ({
  panels: panelsMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { callChatCompletionStreamByType } from "@/lib/llm-provider";
import { readMigratedPanelSegmentIds } from "@/lib/script-segment";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const userId = "user-1";
const projectId = "project-1";
const panelId = "panel-1";

const tx = {
  panel: { findMany: vi.fn(), create: vi.fn() },
};

const mocked = prisma as unknown as {
  panel: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function splitRequest() {
  return POST(
    new Request("http://localhost/api/panel/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panel_id: panelId }),
    }),
  );
}

describe("POST /api/panel/split", () => {
  const split = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.panel.findUnique.mockResolvedValue({
      id: panelId,
      project_id: projectId,
      chapter_id: "chapter-1",
      panel_order: 3,
      panel_type: "medium",
      importance: "medium",
      description: "原描述",
      dialogue: "原对白",
      character_id: "old-char",
      emotion: "怒",
      camera_angle: "仰视",
      shot_size: "全景",
      script_start: 1,
      script_end: 5,
      segment_id: "old-seg",
      project: { user_id: userId },
    });
    (readMigratedPanelSegmentIds as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([[panelId, "seg-kept"]]),
    );
    (callChatCompletionStreamByType as ReturnType<typeof vi.fn>).mockImplementation(async function* () {
      yield JSON.stringify({
        panel1: {
          panel_type: "wide",
          importance: "high",
          description: "前半",
          visual_prompt: "雨",
          english_prompt: "rain a",
          dialogue: "甲",
          character_id: "llm-char",
          emotion: "冷",
          camera_angle: "平视",
          shot_size: "中景",
        },
        panel2: {
          panel_type: "closeup",
          importance: "low",
          description: "后半",
          visual_prompt: "门",
          english_prompt: "door b",
          dialogue: null,
          character_id: "llm-char-2",
          emotion: "惊",
          camera_angle: "俯视",
          shot_size: "特写",
        },
      });
    });
    split.mockResolvedValue([
      { id: "id-2", panelOrder: 4 },
      { id: "id-1", panelOrder: 3 },
    ]);
    panelsMock.mockReturnValue({ split });
    tx.panel.findMany.mockResolvedValue([
      { id: "id-1", description: "full-1" },
      { id: "id-2", description: "full-2" },
    ]);
    mocked.$transaction.mockImplementation(async (work: (client: typeof tx) => Promise<unknown>) => work(tx));
  });

  it("把未加括号的剧本中点传给 split，且不创建分镜行", async () => {
    const response = await splitRequest();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("分镜已拆分");
    expect(body.panels.map((row: { id: string }) => row.id)).toEqual(["id-2", "id-1"]);
    expect(split).toHaveBeenCalledWith(panelId, [
      {
        panelType: "wide",
        importance: "high",
        description: "前半",
        visualPrompt: "雨",
        promptUsed: "rain a",
        dialogue: "甲",
        emotion: "冷",
        cameraAngle: "平视",
        shotSize: "中景",
        segmentId: "seg-kept",
        scriptStart: 1,
        scriptEnd: 0,
      },
      {
        panelType: "closeup",
        importance: "low",
        description: "后半",
        visualPrompt: "门",
        promptUsed: "door b",
        dialogue: null,
        emotion: "惊",
        cameraAngle: "俯视",
        shotSize: "特写",
        segmentId: "seg-kept",
        scriptStart: 0,
        scriptEnd: 5,
      },
    ]);
    expect(mocked.panel.create).not.toHaveBeenCalled();
    expect(tx.panel.create).not.toHaveBeenCalled();
  });
});
