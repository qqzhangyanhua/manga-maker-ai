import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { panels } from "./write";

const missingSceneId = "00000000-0000-4000-8000-00000000abcd";

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("数据库测试需要 TEST_DATABASE_URL");
  return databaseUrl;
}

function openClient(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });
}

async function cleanup(client: PrismaClient, projectId: string, userId: string): Promise<void> {
  if (projectId) await client.project.delete({ where: { id: projectId } }).catch(() => undefined);
  if (userId) {
    await client.character.deleteMany({ where: { user_id: userId } }).catch(() => undefined);
    await client.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
}

describe("章节分镜模块的锁和回滚", () => {
  it("两个方向同时跨章移动不会死锁，结束后两章都是 1..N", async () => {
    const client = openClient();
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let projectId = "";
    let userId = "";

    try {
      const user = await client.user.create({ data: { email: `chapter-panels-lock-${stamp}@example.com` } });
      userId = user.id;
      const project = await client.project.create({ data: { user_id: user.id, title: `对向移动 ${stamp}` } });
      projectId = project.id;
      const chapterA = await client.chapter.create({
        data: { project_id: project.id, title: "甲章", chapter_order: 1 },
      });
      const chapterB = await client.chapter.create({
        data: { project_id: project.id, title: "乙章", chapter_order: 2 },
      });
      const writer = panels(project.id, { db: client });
      const [left] = await writer.add({ panelType: "medium", description: "甲" }, { chapter: chapterA.id });
      const [stayA] = await writer.add({ panelType: "medium", description: "甲留" }, { chapter: chapterA.id });
      const [right] = await writer.add({ panelType: "closeup", description: "乙" }, { chapter: chapterB.id });
      const [stayB] = await writer.add({ panelType: "closeup", description: "乙留" }, { chapter: chapterB.id });
      if (!left || !stayA || !right || !stayB) throw new Error("种子分镜没有建成");

      await Promise.all([
        writer.place([left.id], { chapter: chapterB.id }),
        writer.place([right.id], { chapter: chapterA.id }),
      ]);

      const rowsA = await client.panel.findMany({
        where: { chapter_id: chapterA.id },
        orderBy: { panel_order: "asc" },
        select: { id: true, panel_order: true },
      });
      const rowsB = await client.panel.findMany({
        where: { chapter_id: chapterB.id },
        orderBy: { panel_order: "asc" },
        select: { id: true, panel_order: true },
      });

      expect(rowsA.map((row) => row.panel_order)).toEqual(rowsA.map((_row, index) => index + 1));
      expect(rowsB.map((row) => row.panel_order)).toEqual(rowsB.map((_row, index) => index + 1));
      expect(new Set(rowsA.map((row) => row.id))).toEqual(new Set([stayA.id, right.id]));
      expect(new Set(rowsB.map((row) => row.id))).toEqual(new Set([stayB.id, left.id]));
    } finally {
      await cleanup(client, projectId, userId);
      await client.$disconnect();
    }
  });

  it("替换写到一半失败时，旧分镜、候选图和在场角色都还在", async () => {
    const client = openClient();
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let projectId = "";
    let userId = "";

    try {
      const user = await client.user.create({ data: { email: `chapter-panels-replace-${stamp}@example.com` } });
      userId = user.id;
      const project = await client.project.create({ data: { user_id: user.id, title: `替换回滚 ${stamp}` } });
      projectId = project.id;
      const character = await client.character.create({ data: { user_id: user.id, name: "甲" } });
      const projectCharacter = await client.projectCharacter.create({
        data: { project_id: project.id, character_id: character.id, role: "supporting" },
      });
      const chapter = await client.chapter.create({
        data: { project_id: project.id, title: "第一章", chapter_order: 1 },
      });
      const writer = panels(project.id, { db: client });
      const [oldPanel] = await writer.add({ panelType: "dialogue", description: "旧分镜" }, { chapter: chapter.id });
      if (!oldPanel) throw new Error("种子分镜没有建成");
      await writer.setCast(oldPanel.id, [{ projectCharacterId: projectCharacter.id }]);
      await client.panelVariant.create({
        data: {
          panel_id: oldPanel.id,
          image_url: "https://example.com/old.png",
          prompt: "旧提示",
          variant_type: "original",
        },
      });

      await expect(writer.replaceChapter(chapter.id, [
        { panelType: "wide", description: "新的第一格" },
        { panelType: "closeup", description: "引用不存在的场景", sceneId: missingSceneId },
      ])).rejects.toThrow();

      const still = await client.panel.findUnique({ where: { id: oldPanel.id } });
      expect(still?.description).toBe("旧分镜");
      expect(still?.panel_order).toBe(1);
      const variants = await client.panelVariant.findMany({ where: { panel_id: oldPanel.id } });
      expect(variants).toHaveLength(1);
      const cast = await client.panelCharacter.findMany({ where: { panel_id: oldPanel.id } });
      expect(cast.map((row) => row.project_character_id)).toEqual([projectCharacter.id]);
      const chapterPanels = await client.panel.findMany({ where: { chapter_id: chapter.id } });
      expect(chapterPanels.map((row) => row.id)).toEqual([oldPanel.id]);
    } finally {
      await cleanup(client, projectId, userId);
      await client.$disconnect();
    }
  });
});
