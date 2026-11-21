import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookies, mockCookieGet, setLead, setCast, panelsMock } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet });
  const setLead = vi.fn();
  const setCast = vi.fn();
  const panelsMock = vi.fn(() => ({ setLead, setCast, remove: vi.fn() }));
  return { mockCookies, mockCookieGet, setLead, setCast, panelsMock };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/project/chapter-panels", () => ({
  panels: panelsMock,
  panelReadingOrderBy: [],
  readingOrder: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    character: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    projectCharacter: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
    },
    panelCharacter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PATCH } from "./route";

const userId = "user-1";
const projectId = "project-1";
const panelId = "panel-1";

const mocked = prisma as unknown as {
  panel: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  character: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  projectCharacter: { createMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  panelCharacter: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

function patch(body: Record<string, unknown>) {
  return PATCH(
    new Request(`http://localhost/api/panel/${panelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { id: panelId } }
  );
}

describe("PATCH /api/panel/[id] 角色绑定", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.panel.findUnique.mockResolvedValue({
      id: panelId,
      project_id: projectId,
      project: { id: projectId, user_id: userId },
    });
    mocked.panel.update.mockResolvedValue({ id: panelId });
    mocked.projectCharacter.findUnique.mockResolvedValue({ id: "pc-1" });
    mocked.panelCharacter.findMany.mockResolvedValue([]);
    setLead.mockResolvedValue(undefined);
    setCast.mockResolvedValue(undefined);
  });

  it("绑定不属于当前用户的角色时返回 400，且不更新分镜", async () => {
    mocked.character.findMany.mockResolvedValue([]);

    const response = await patch({ character_id: "other-character" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("INVALID_CHARACTER");
    expect(mocked.projectCharacter.createMany).not.toHaveBeenCalled();
    expect(setLead).not.toHaveBeenCalled();
    expect(mocked.panel.update).not.toHaveBeenCalled();
  });

  it("绑定角色库中的角色时自动加入项目角色", async () => {
    mocked.character.findMany.mockResolvedValue([{ id: "my-character" }]);

    const response = await patch({ character_id: "my-character" });

    expect(response.status).toBe(200);
    expect(mocked.character.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["my-character"] }, user_id: userId },
      select: { id: true },
    });
    expect(mocked.projectCharacter.createMany).toHaveBeenCalledWith({
      data: [{ project_id: projectId, character_id: "my-character", role: "minor" }],
      skipDuplicates: true,
    });
    expect(mocked.projectCharacter.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project_id_character_id: {
            project_id: projectId,
            character_id: "my-character",
          },
        },
      }),
    );
    expect(setLead).toHaveBeenCalledWith([panelId], "pc-1");
    expect(mocked.panel.update).not.toHaveBeenCalled();
    for (const call of mocked.panel.update.mock.calls) {
      const arg = call[0] as { data?: Record<string, unknown> } | undefined;
      expect(arg?.data ?? {}).not.toHaveProperty("character_id");
    }
  });

  it("解绑角色（character_id 为 null）时不校验角色", async () => {
    mocked.panelCharacter.findMany.mockResolvedValue([
      {
        project_character_id: "pc-lead",
        outfit_id: "outfit-1",
        expression_type: "happy",
        sort_order: 0,
      },
      {
        project_character_id: "pc-next",
        outfit_id: null,
        expression_type: "sad",
        sort_order: 1,
      },
    ]);

    const response = await patch({ character_id: null });

    expect(response.status).toBe(200);
    expect(mocked.character.findMany).not.toHaveBeenCalled();
    expect(mocked.character.findFirst).not.toHaveBeenCalled();
    expect(setLead).not.toHaveBeenCalled();
    expect(setCast).toHaveBeenCalledWith(panelId, [
      { projectCharacterId: "pc-next", outfitId: null, expression: "sad" },
    ]);
    expect(mocked.panel.update).not.toHaveBeenCalled();
    for (const call of mocked.panel.update.mock.calls) {
      const arg = call[0] as { data?: Record<string, unknown> } | undefined;
      expect(arg?.data ?? {}).not.toHaveProperty("character_id");
    }
  });
});
