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
    panel: { findUnique: vi.fn(), update: vi.fn() },
    projectCharacter: { findMany: vi.fn() },
    panelCharacter: { deleteMany: vi.fn(), createMany: vi.fn() },
    scene: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PATCH } from "./route";

const userId = "user-1";
const panelId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const projectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const foreignProjectCharacterId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const mocked = prisma as unknown as {
  panel: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  projectCharacter: { findMany: ReturnType<typeof vi.fn> };
  panelCharacter: { createMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function ownedPanel() {
  return {
    id: panelId,
    project_id: projectId,
    segment_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    panel_order: 2,
    camera_angle: null,
    shot_size: null,
    panel_type: "medium",
    description: "原来的描述",
    composition_hint: null,
    location_key: null,
    scene_id: null,
    visual_prompt: null,
    negative_prompt: null,
    generated_image: null,
    generation_status: "pending",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    panel_characters: [],
    pipeline_state: null,
    project: { user_id: userId },
    segment: {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      timeline_chapter: {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        timeline_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      },
    },
  };
}

function patch(body: Record<string, unknown>) {
  return PATCH(new Request(`http://localhost/api/canvas/shot-design/${panelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: panelId }) });
}

describe("PATCH /api/canvas/shot-design/[id] 出场角色", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.panel.findUnique.mockResolvedValue(ownedPanel());
    mocked.projectCharacter.findMany.mockResolvedValue([]);
  });

  it("项目角色不属于这个项目时返回 400，并且不写库", async () => {
    const response = await patch({
      characters: [{ project_character_id: foreignProjectCharacterId, outfit_id: null, expression: null }],
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "PROJECT_CHARACTER_MISMATCH" });
    expect(mocked.$transaction).not.toHaveBeenCalled();
    expect(mocked.panel.update).not.toHaveBeenCalled();
    expect(mocked.panelCharacter.createMany).not.toHaveBeenCalled();
  });

  it("出场行再交待绑定标识时返回 400，并且不读库也不写库", async () => {
    const response = await patch({
      characters: [{
        project_character_id: foreignProjectCharacterId,
        pending_character_key: "unbound-n1",
      }],
    });

    expect(response.status).toBe(400);
    expect(mocked.panel.findUnique).not.toHaveBeenCalled();
    expect(mocked.$transaction).not.toHaveBeenCalled();
  });
});
