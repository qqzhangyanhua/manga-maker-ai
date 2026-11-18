import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { ensureStoryProject, findStoryProject } from "./story-project";

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
