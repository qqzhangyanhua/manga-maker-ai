import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet, add, setLead, panelsMock, ensureProjectCharacters, resolvePanelChapter } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const add = vi.fn();
  const setLead = vi.fn();
  const panelsMock = vi.fn(() => ({ add, setLead }));
  const ensureProjectCharacters = vi.fn();
  const resolvePanelChapter = vi.fn();
  return { mockCookieGet, add, setLead, panelsMock, ensureProjectCharacters, resolvePanelChapter };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockCookieGet }),
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/project/chapter-panels", () => ({
  panels: panelsMock,
}));

vi.mock("@/lib/project", () => ({
  ensureProjectCharacters,
  resolvePanelChapter,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    character: { findFirst: vi.fn() },
    projectCharacter: { findUnique: vi.fn() },
    panel: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const userId = "user-1";
const projectId = "11111111-1111-4111-8111-111111111111";
const chapterId = "chapter-1";

const mocked = prisma as unknown as {
  project: { findUnique: ReturnType<typeof vi.fn> };
  projectCharacter: { findUnique: ReturnType<typeof vi.fn> };
  panel: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function create(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/panel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/panel 创建分镜", () => {
  let transactionClient: {
    projectCharacter: typeof mocked.projectCharacter;
    panel: typeof mocked.panel;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.project.findUnique.mockResolvedValue({ id: projectId, user_id: userId });
    resolvePanelChapter.mockResolvedValue(chapterId);
    add.mockResolvedValue([{ id: "new-panel", panelOrder: 1 }]);
    setLead.mockResolvedValue(undefined);
    ensureProjectCharacters.mockResolvedValue(undefined);
    mocked.projectCharacter.findUnique.mockResolvedValue({ id: "project-character-1" });
    mocked.panel.findUnique.mockResolvedValue({
      id: "new-panel",
      character: { id: "library-character", name: "主角" },
    });
    transactionClient = {
      projectCharacter: mocked.projectCharacter,
      panel: mocked.panel,
    };
    mocked.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn !== "function") {
        throw new Error("expected transaction callback");
      }
      return (fn as (tx: typeof transactionClient) => Promise<unknown>)(transactionClient);
    });
  });

  it("未登录时返回 401", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await create({ project_id: projectId });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("未登录");
    expect(panelsMock).not.toHaveBeenCalled();
  });

  it("panel_order 省略时追加到章尾，add 不带 index", async () => {
    const response = await create({ project_id: projectId, description: "开场" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("分镜创建成功");
    expect(resolvePanelChapter).toHaveBeenCalledWith(prisma, projectId, undefined);
    expect(panelsMock).toHaveBeenCalledWith(projectId, { tx: transactionClient });
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]?.[1]).toEqual({ chapter: chapterId });
    expect(ensureProjectCharacters).not.toHaveBeenCalled();
    expect(mocked.panel.updateMany).not.toHaveBeenCalled();
  });

  it("panel_order 为 2 时按 1 起始换成 index 1", async () => {
    const response = await create({ project_id: projectId, panel_order: 2 });

    expect(response.status).toBe(200);
    expect(add.mock.calls[0]?.[1]).toEqual({ chapter: chapterId, index: 1 });
  });

  it("传入角色库 id 时 setLead 使用项目角色 id，且不把 character_id 写进 panel", async () => {
    const response = await create({
      project_id: projectId,
      character_id: "library-character",
      description: "对白",
    });

    expect(response.status).toBe(200);
    expect(ensureProjectCharacters).toHaveBeenCalledWith(transactionClient, {
      projectId,
      userId,
      characterIds: ["library-character"],
    });
    expect(mocked.projectCharacter.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project_id_character_id: {
            project_id: projectId,
            character_id: "library-character",
          },
        },
      }),
    );
    expect(setLead).toHaveBeenCalledWith(["new-panel"], "project-character-1");
    expect(add.mock.calls[0]?.[0]).not.toHaveProperty("character_id");
    expect(mocked.panel.create).not.toHaveBeenCalled();
    expect(mocked.panel.update).not.toHaveBeenCalled();
    for (const call of [...mocked.panel.create.mock.calls, ...mocked.panel.update.mock.calls]) {
      const arg = call[0] as { data?: Record<string, unknown> } | undefined;
      expect(arg?.data ?? {}).not.toHaveProperty("character_id");
    }
  });
});
