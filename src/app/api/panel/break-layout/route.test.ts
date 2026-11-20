import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookieGet } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  return { mockCookieGet };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mockCookieGet }),
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PATCH } from "./route";

const userId = "user-1";

type Row = {
  id: string;
  project_id: string;
  chapter_id: string;
  panel_order: number;
  layout_hint: string | null;
};

const rows: Row[] = [
  { id: "start", project_id: "project-1", chapter_id: "c1", panel_order: 1, layout_hint: "group_start_2" },
  { id: "intruder", project_id: "project-1", chapter_id: "c2", panel_order: 2, layout_hint: "group_member" },
  { id: "member", project_id: "project-1", chapter_id: "c1", panel_order: 3, layout_hint: "group_member" },
];

const mocked = prisma as unknown as {
  panel: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

describe("PATCH /api/panel/break-layout", () => {
  const resetIds: string[][] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    resetIds.length = 0;
    mockCookieGet.mockReturnValue({ value: "token" });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId });
    mocked.panel.findUnique.mockResolvedValue({
      id: "start",
      project_id: "project-1",
      chapter_id: "c1",
      panel_order: 1,
      layout_hint: "group_start_2",
      project: { id: "project-1", user_id: userId },
    });
    mocked.panel.findMany.mockImplementation(async (args: {
      where?: { project_id?: string; chapter_id?: string; id?: { in: string[] } };
    }) => {
      if (args.where?.id?.in) {
        const ids = new Set(args.where.id.in);
        return rows.filter((row) => ids.has(row.id));
      }
      return rows
        .filter((row) => row.project_id === args.where?.project_id)
        .filter((row) => !args.where?.chapter_id || row.chapter_id === args.where.chapter_id)
        .sort((left, right) => left.panel_order - right.panel_order || left.id.localeCompare(right.id));
    });
    mocked.panel.updateMany.mockImplementation(async (args: { where: { id: { in: string[] } } }) => {
      resetIds.push(args.where.id.in);
      return { count: args.where.id.in.length };
    });
  });

  it("拆版不会把另一章节的分镜当成邻格", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/panel/break-layout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId: "start" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(resetIds).toEqual([["start", "member"]]);
  });
});
