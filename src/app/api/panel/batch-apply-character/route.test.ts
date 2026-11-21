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

vi.mock("@/lib/project/chapter-panels", async () => {
  const actual = await vi.importActual<typeof import("@/lib/project/chapter-panels")>(
    "@/lib/project/chapter-panels",
  );
  return {
    ...actual,
    panels: panelsMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: { findMany: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const userId = "user-1";
const characterId = "char-lib";

const tx = {
  character: { findMany: vi.fn() },
  projectCharacter: { createMany: vi.fn(), findUnique: vi.fn() },
  panel: { updateMany: vi.fn() },
};

const mocked = prisma as unknown as {
  panel: { findMany: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const setLead = vi.fn();

function apply(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/panel/batch-apply-character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function ownedPanel(id: string, projectId: string) {
  return {
    id,
    project_id: projectId,
    project: { id: projectId, user_id: userId },
  };
}

describe("POST /api/panel/batch-apply-character", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    setLead.mockResolvedValue(undefined);
    panelsMock.mockImplementation(() => ({ setLead }));
    tx.character.findMany.mockResolvedValue([{ id: characterId }]);
    tx.projectCharacter.createMany.mockResolvedValue({ count: 1 });
    tx.projectCharacter.findUnique.mockImplementation(async (args: {
      where: { project_id_character_id: { project_id: string; character_id: string } };
    }) => {
      const projectId = args.where.project_id_character_id.project_id;
      if (projectId === "project-a") return { id: "pc-a" };
      if (projectId === "project-b") return { id: "pc-b" };
      return null;
    });
    mocked.$transaction.mockImplementation(async (work: (client: typeof tx) => Promise<number>) => work(tx));
  });

  it("两个项目的分镜各调一次 setLead，参数是项目角色 id", async () => {
    mocked.panel.findMany.mockResolvedValue([
      ownedPanel("panel-a1", "project-a"),
      ownedPanel("panel-b1", "project-b"),
      ownedPanel("panel-a2", "project-a"),
    ]);

    const response = await apply({
      panel_ids: ["panel-a1", "panel-b1", "panel-a2"],
      character_id: characterId,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.updated).toBe(3);
    expect(panelsMock.mock.calls.map((call) => call[0])).toEqual(["project-a", "project-b"]);
    expect(setLead.mock.calls).toEqual([
      [["panel-a1", "panel-a2"], "pc-a"],
      [["panel-b1"], "pc-b"],
    ]);
    expect(JSON.stringify(setLead.mock.calls)).not.toContain(characterId);
    expect(mocked.panel.updateMany).not.toHaveBeenCalled();
    expect(tx.panel.updateMany).not.toHaveBeenCalled();
  });

  it("角色不属于用户时 400，且不 setLead", async () => {
    mocked.panel.findMany.mockResolvedValue([
      ownedPanel("panel-a1", "project-a"),
    ]);
    tx.character.findMany.mockResolvedValue([]);

    const response = await apply({
      panel_ids: ["panel-a1"],
      character_id: characterId,
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("角色不存在或不属于当前用户");
    expect(setLead).not.toHaveBeenCalled();
    expect(panelsMock).not.toHaveBeenCalled();
  });
});
