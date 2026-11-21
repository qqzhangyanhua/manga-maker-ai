import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet, setLead, panelsMock, ensureProjectCharacters } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const setLead = vi.fn();
  const panelsMock = vi.fn(() => ({ setLead }));
  const ensureProjectCharacters = vi.fn();
  return { mockCookieGet, setLead, panelsMock, ensureProjectCharacters };
});

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
  return { ...actual, panels: panelsMock };
});

vi.mock("@/lib/project", () => ({
  ensureProjectCharacters,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: { findMany: vi.fn(), updateMany: vi.fn() },
    projectCharacter: { findUnique: vi.fn() },
    panelCharacter: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

const userId = "user-1";
const projectId = "11111111-1111-4111-8111-111111111111";
const panelId = "panel-1";

const mocked = prisma as unknown as {
  panel: { findMany: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  projectCharacter: { findUnique: ReturnType<typeof vi.fn> };
  panelCharacter: { findFirst: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function update(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/panel/batch-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

describe("POST /api/panel/batch-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    ensureProjectCharacters.mockResolvedValue(undefined);
    setLead.mockResolvedValue(undefined);
    mocked.projectCharacter.findUnique.mockResolvedValue({ id: "pc-1" });
    mocked.panelCharacter.findFirst.mockResolvedValue(null);
    mocked.panel.updateMany.mockResolvedValue({ count: 1 });
    mocked.panel.findMany.mockResolvedValue([
      { id: panelId, project_id: projectId, project: { id: projectId, user_id: userId } },
    ]);
    mocked.$transaction.mockImplementation(async (fn: unknown) => {
      if (typeof fn !== "function") throw new Error("expected transaction callback");
      return (fn as (tx: typeof prisma) => Promise<unknown>)(prisma);
    });
  });

  it("角色和内容一起改时，主角色走 setLead，updateMany 不写主角色列", async () => {
    const response = await update({
      panelIds: [panelId],
      updates: { character_id: "library-1", panel_type: "closeup" },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(ensureProjectCharacters).toHaveBeenCalledWith(prisma, {
      projectId,
      userId,
      characterIds: ["library-1"],
    });
    expect(panelsMock).toHaveBeenCalledWith(projectId, { tx: prisma });
    expect(setLead).toHaveBeenCalledWith([panelId], "pc-1", undefined);
    expect(mocked.panel.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [panelId] } },
      data: { panel_type: "closeup" },
    });
    const written = mocked.panel.updateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(written.data).not.toHaveProperty("character_id");
    expect(written.data).not.toHaveProperty("outfit_id");
    expect(written.data).not.toHaveProperty("expression_type");
  });

  it("没有在场角色时不能只改服装或表情", async () => {
    const response = await update({
      panelIds: [panelId],
      updates: { expression_type: "happy" },
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe("LEAD_MISSING");
    expect(data.error).toBe("没有在场角色，不能改主角色的服装或表情");
    expect(mocked.panelCharacter.findFirst).toHaveBeenCalledWith({
      where: { panel_id: panelId, project_character_id: { not: null } },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }, { id: "asc" }],
      select: { project_character_id: true },
    });
    expect(setLead).not.toHaveBeenCalled();
    expect(mocked.panel.updateMany).not.toHaveBeenCalled();
  });
});
