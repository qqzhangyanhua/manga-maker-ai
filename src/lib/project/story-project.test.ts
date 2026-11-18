import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  deleteProjectWithStory,
  deleteStoryWithProject,
  ensureStoryProject,
  findStoryProject,
} from "./story-project";

function createDb() {
  return {
    project: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    story: {
      findUnique: vi.fn(),
    },
  };
}

const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

describe("故事主项目", () => {
  it("findStoryProject 按故事 ID 查找项目", async () => {
    const db = createDb();
    db.project.findFirst.mockResolvedValue({ id: "p1" });

    const project = await findStoryProject(asClient(db), "s1");

    expect(project).toEqual({ id: "p1" });
    expect(db.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { story_id: "s1" } })
    );
  });

  it("已有主项目时直接返回，不新建", async () => {
    const db = createDb();
    db.project.findFirst.mockResolvedValue({ id: "p1", story_id: "s1" });

    const project = await ensureStoryProject(asClient(db), "s1");

    expect(project.id).toBe("p1");
    expect(db.project.create).not.toHaveBeenCalled();
    expect(db.story.findUnique).not.toHaveBeenCalled();
  });

  it("没有主项目时按故事设定新建", async () => {
    const db = createDb();
    db.project.findFirst.mockResolvedValue(null);
    db.story.findUnique.mockResolvedValue({
      user_id: "u1",
      title: "标题",
      genre: "daily",
      premise: "梗概",
      outline: { acts: [] },
      template_id: null,
      comic_style_id: "cs1",
      style_reference_image: null,
      is_serialized: true,
      serial_status: "ongoing",
      is_sample: false,
      sample_category: null,
      source_type: "original",
      source_novel_id: null,
    });
    db.project.create.mockImplementation(async ({ data }) => ({ id: "p2", ...data }));

    const project = await ensureStoryProject(asClient(db), "s1");

    expect(project.id).toBe("p2");
    expect(db.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: "u1",
        story_id: "s1",
        title: "标题",
        genre: "daily",
        premise: "梗概",
        outline: { acts: [] },
        comic_style_id: "cs1",
        is_serialized: true,
        serial_status: "ongoing",
        source_type: "original",
        status: "draft",
      }),
    });
  });

  it("故事不存在时报错", async () => {
    const db = createDb();
    db.project.findFirst.mockResolvedValue(null);
    db.story.findUnique.mockResolvedValue(null);

    await expect(ensureStoryProject(asClient(db), "missing")).rejects.toThrow("故事不存在");
    expect(db.project.create).not.toHaveBeenCalled();
  });
});

describe("删除项目与故事", () => {
  function createDeleteDb() {
    const db = {
      project: { findUnique: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
      story: { delete: vi.fn() },
      $transaction: vi.fn(),
    };
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db));
    return db;
  }
  const asDeleteClient = (db: ReturnType<typeof createDeleteDb>) => db as unknown as PrismaClient;

  it("删除故事主项目时先删故事再删项目", async () => {
    const db = createDeleteDb();
    db.project.findUnique.mockResolvedValue({ story_id: "s1" });
    const order: string[] = [];
    db.story.delete.mockImplementation(async () => order.push("story"));
    db.project.delete.mockImplementation(async () => order.push("project"));

    await deleteProjectWithStory(asDeleteClient(db), "p1");

    expect(db.story.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(db.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
    expect(order).toEqual(["story", "project"]);
  });

  it("独立项目只删项目", async () => {
    const db = createDeleteDb();
    db.project.findUnique.mockResolvedValue({ story_id: null });

    await deleteProjectWithStory(asDeleteClient(db), "p1");

    expect(db.story.delete).not.toHaveBeenCalled();
    expect(db.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("删除故事时一并删除主项目", async () => {
    const db = createDeleteDb();
    db.project.findFirst.mockResolvedValue({ id: "p1", story_id: "s1" });

    await deleteStoryWithProject(asDeleteClient(db), "s1");

    expect(db.story.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    expect(db.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
