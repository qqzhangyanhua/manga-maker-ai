import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/api-helpers", () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public statusCode = 500, public code?: string) {
      super(message);
    }
  },
}));

import {
  assertChapterInProject,
  assertPanelsInProject,
  ensureProjectCharacters,
  filterOwnedCharacterIds,
  getProjectForUser,
} from "./access";

function createDb() {
  return {
    project: { findUnique: vi.fn() },
    chapter: { findUnique: vi.fn() },
    panel: { count: vi.fn() },
    character: { findMany: vi.fn() },
    projectCharacter: { createMany: vi.fn() },
  };
}
const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

describe("项目访问校验", () => {
  it("getProjectForUser：不存在 404，他人项目 403，本人项目返回", async () => {
    const db = createDb();
    db.project.findUnique.mockResolvedValueOnce(null);
    await expect(getProjectForUser(asClient(db), "p1", "u1")).rejects.toMatchObject({ statusCode: 404 });

    db.project.findUnique.mockResolvedValueOnce({ id: "p1", user_id: "u2" });
    await expect(getProjectForUser(asClient(db), "p1", "u1")).rejects.toMatchObject({ statusCode: 403 });

    db.project.findUnique.mockResolvedValueOnce({ id: "p1", user_id: "u1", story_id: null });
    await expect(getProjectForUser(asClient(db), "p1", "u1")).resolves.toMatchObject({ id: "p1" });
  });

  it("assertChapterInProject：章节属于别的项目时拒绝", async () => {
    const db = createDb();
    db.chapter.findUnique.mockResolvedValueOnce({ id: "c1", project_id: "p2" });
    await expect(assertChapterInProject(asClient(db), "c1", "p1")).rejects.toMatchObject({
      statusCode: 400,
      code: "CHAPTER_PROJECT_MISMATCH",
    });

    db.chapter.findUnique.mockResolvedValueOnce(null);
    await expect(assertChapterInProject(asClient(db), "c1", "p1")).rejects.toMatchObject({ statusCode: 404 });

    db.chapter.findUnique.mockResolvedValueOnce({ id: "c1", project_id: "p1" });
    await expect(assertChapterInProject(asClient(db), "c1", "p1")).resolves.toMatchObject({ id: "c1" });
  });

  it("assertPanelsInProject：去重后逐个核对", async () => {
    const db = createDb();
    db.panel.count.mockResolvedValueOnce(1);
    await expect(assertPanelsInProject(asClient(db), ["a", "b"], "p1")).rejects.toMatchObject({ statusCode: 400 });

    db.panel.count.mockResolvedValueOnce(2);
    await expect(assertPanelsInProject(asClient(db), ["a", "b", "a"], "p1")).resolves.toBeUndefined();
    expect(db.panel.count).toHaveBeenLastCalledWith({ where: { id: { in: ["a", "b"] }, project_id: "p1" } });
  });
});

describe("项目角色", () => {
  it("没有角色时不查询", async () => {
    const db = createDb();
    await ensureProjectCharacters(asClient(db), { projectId: "p1", userId: "u1", characterIds: [null, undefined, ""] });
    expect(db.character.findMany).not.toHaveBeenCalled();
    expect(db.projectCharacter.createMany).not.toHaveBeenCalled();
  });

  it("角色不属于当前用户时拒绝，不写项目角色", async () => {
    const db = createDb();
    db.character.findMany.mockResolvedValue([{ id: "c1" }]);
    await expect(
      ensureProjectCharacters(asClient(db), { projectId: "p1", userId: "u1", characterIds: ["c1", "c2"] })
    ).rejects.toMatchObject({ statusCode: 400, code: "INVALID_CHARACTER" });
    expect(db.projectCharacter.createMany).not.toHaveBeenCalled();
  });

  it("角色库中的角色自动加入项目角色，已存在的跳过", async () => {
    const db = createDb();
    db.character.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    await ensureProjectCharacters(asClient(db), { projectId: "p1", userId: "u1", characterIds: ["c1", "c2", "c1"] });
    expect(db.character.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "c2"] }, user_id: "u1" },
      select: { id: true },
    });
    expect(db.projectCharacter.createMany).toHaveBeenCalledWith({
      data: [
        { project_id: "p1", character_id: "c1", role: "minor" },
        { project_id: "p1", character_id: "c2", role: "minor" },
      ],
      skipDuplicates: true,
    });
  });

  it("filterOwnedCharacterIds：只保留当前用户的角色，空值不查询", async () => {
    const db = createDb();
    await expect(filterOwnedCharacterIds(asClient(db), "u1", [null, ""])).resolves.toEqual(new Set());
    expect(db.character.findMany).not.toHaveBeenCalled();

    db.character.findMany.mockResolvedValue([{ id: "c1" }]);
    const owned = await filterOwnedCharacterIds(asClient(db), "u1", ["c1", "fake", "c1"]);
    expect(owned).toEqual(new Set(["c1"]));
    expect(db.character.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "fake"] }, user_id: "u1" },
      select: { id: true },
    });
  });
});
