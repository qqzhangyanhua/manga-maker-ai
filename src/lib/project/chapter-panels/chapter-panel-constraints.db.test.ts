import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { panels } from "./write";

function databaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL?.trim();
  if (!url) throw new Error("数据库测试需要 TEST_DATABASE_URL");
  return url;
}

function errorText(error: unknown, depth = 0): string {
  if (depth > 6 || error == null) return "";
  if (!(error instanceof Error)) return String(error);
  const extra = error as Error & { code?: string; meta?: unknown; cause?: unknown };
  return [extra.code, extra.message, JSON.stringify(extra.meta ?? ""), errorText(extra.cause, depth + 1)].join(" ");
}

async function expectReject(work: Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await work;
  } catch (error) {
    expect(errorText(error)).toMatch(pattern);
    return;
  }
  throw new Error(`应当拒绝：${pattern}`);
}

interface Fixture {
  client: PrismaClient;
  projectId: string;
  chapterId: string;
  characterId: string;
  otherCharacterId: string;
  projectCharacterId: string;
  outfitId: string;
}

async function withFixture(name: string, work: (fixture: Fixture) => Promise<void>): Promise<void> {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let projectId = "";
  let userId = "";
  try {
    const user = await client.user.create({ data: { email: `${name}-${stamp}@example.com` } });
    userId = user.id;
    const project = await client.project.create({ data: { user_id: user.id, title: name } });
    projectId = project.id;
    const chapter = await client.chapter.create({
      data: { project_id: project.id, title: "第一章", chapter_order: 1 },
    });
    const character = await client.character.create({ data: { user_id: user.id, name: "甲" } });
    const other = await client.character.create({ data: { user_id: user.id, name: "乙" } });
    const outfit = await client.characterOutfit.create({
      data: { character_id: character.id, outfit_name: "常服", outfit_type: "casual" },
    });
    const projectCharacter = await client.projectCharacter.create({
      data: { project_id: project.id, character_id: character.id, role: "supporting" },
    });
    await work({
      client,
      projectId,
      chapterId: chapter.id,
      characterId: character.id,
      otherCharacterId: other.id,
      projectCharacterId: projectCharacter.id,
      outfitId: outfit.id,
    });
  } finally {
    if (projectId) await client.project.delete({ where: { id: projectId } });
    if (userId) await client.user.delete({ where: { id: userId } });
    await client.$disconnect();
  }
}

async function ordersOf(client: PrismaClient, chapterId: string): Promise<number[]> {
  const rows = await client.panel.findMany({
    where: { chapter_id: chapterId },
    orderBy: { panel_order: "asc" },
    select: { panel_order: true },
  });
  return rows.map((row) => row.panel_order);
}

describe("章节分镜数据库约束", () => {
  it("重复的章节编号在提交时拒绝，失败后编号仍是原来的", async () => {
    await withFixture("constraint-duplicate", async ({ client, projectId, chapterId }) => {
      const writer = panels(projectId, { db: client });
      await writer.add(
        [
          { panelType: "medium", description: "甲" },
          { panelType: "closeup", description: "乙" },
        ],
        { chapter: chapterId },
      );
      const rows = await client.panel.findMany({
        where: { chapter_id: chapterId },
        orderBy: { panel_order: "asc" },
      });
      const first = rows[0];
      if (!first) throw new Error("缺少第一格");

      await expectReject(
        client.$transaction((tx) => tx.panel.update({
          where: { id: first.id },
          data: { panel_order: 2 },
        })),
        /panels_chapter_panel_order_key|23505|Unique constraint/i,
      );
      expect(await ordersOf(client, chapterId)).toEqual([1, 2]);
    });
  });

  it("同一事务里可以暂时撞号，提交前改回唯一就通过", async () => {
    await withFixture("constraint-swap", async ({ client, projectId, chapterId }) => {
      const writer = panels(projectId, { db: client });
      await writer.add(
        [
          { panelType: "medium", description: "甲" },
          { panelType: "closeup", description: "乙" },
        ],
        { chapter: chapterId },
      );
      const rows = await client.panel.findMany({
        where: { chapter_id: chapterId },
        orderBy: { panel_order: "asc" },
      });
      const first = rows[0];
      const second = rows[1];
      if (!first || !second) throw new Error("缺少两格");

      await client.$transaction(async (tx) => {
        await tx.panel.update({ where: { id: first.id }, data: { panel_order: 2 } });
        await tx.panel.update({ where: { id: second.id }, data: { panel_order: 1 } });
      });

      const swapped = await client.panel.findMany({
        where: { chapter_id: chapterId },
        orderBy: { panel_order: "asc" },
        select: { id: true },
      });
      expect(swapped.map((row) => row.id)).toEqual([second.id, first.id]);
    });
  });

  it("直接写下和第一位在场角色不一致的主角色会被拒绝", async () => {
    await withFixture("constraint-lead", async (fixture) => {
      const { client, projectId, chapterId, characterId, otherCharacterId, projectCharacterId, outfitId } = fixture;
      const created = await panels(projectId, { db: client }).add(
        { panelType: "dialogue", description: "对白" },
        { chapter: chapterId },
      );
      const panelId = created[0]?.id;
      if (!panelId) throw new Error("缺少分镜");
      await panels(projectId, { db: client }).setCast(panelId, [{
        projectCharacterId,
        outfitId,
        expression: "shy",
      }]);

      await expectReject(
        client.panel.update({ where: { id: panelId }, data: { character_id: otherCharacterId } }),
        /主角色必须等于第一位在场角色/,
      );
      await client.panel.update({
        where: { id: panelId },
        data: { character_id: characterId, outfit_id: outfitId, expression_type: "shy" },
      });
      const kept = await client.panel.findUnique({ where: { id: panelId } });
      expect(kept?.character_id).toBe(characterId);
      expect(kept?.outfit_id).toBe(outfitId);
      expect(kept?.expression_type).toBe("shy");
    });
  });

  it("提交后的添加、删除、移动、拆分、合并、在场角色、主角色和整章替换编号仍然唯一", async () => {
    await withFixture("constraint-verbs", async ({ client, projectId, chapterId, projectCharacterId, outfitId }) => {
      const writer = panels(projectId, { db: client });
      const added = await writer.add({ panelType: "medium", description: "甲" }, { chapter: chapterId });
      const front = await writer.add(
        { panelType: "closeup", description: "乙" },
        { chapter: chapterId, index: 0 },
      );
      const firstId = added[0]?.id;
      const secondId = front[0]?.id;
      if (!firstId || !secondId) throw new Error("缺少新分镜");

      await writer.setCast(firstId, [{ projectCharacterId, outfitId, expression: "shy" }]);
      await writer.setLead([secondId], projectCharacterId);
      const split = await writer.split(firstId, [{ description: "拆一" }, { description: "拆二" }]);
      expect(split.length).toBeGreaterThanOrEqual(1);
      const placed = await writer.place([secondId], { chapter: chapterId, index: 0 });
      expect(placed[0]?.panelOrder).toBe(1);

      const beforeMerge = await client.panel.findMany({
        where: { chapter_id: chapterId },
        orderBy: { panel_order: "asc" },
        select: { id: true },
      });
      const mergeIds = beforeMerge.slice(0, 2).map((row) => row.id);
      expect(mergeIds).toHaveLength(2);
      await writer.merge(mergeIds, { description: "合并" });
      const replaced = await writer.replaceChapter(chapterId, [
        { panelType: "wide", description: "新一" },
        { panelType: "dialogue", description: "新二" },
      ]);
      const removeId = replaced.panels[0]?.id;
      if (!removeId) throw new Error("整章替换没有留下分镜");
      await writer.remove([removeId]);

      const finalOrders = await ordersOf(client, chapterId);
      expect(finalOrders).toEqual([1]);
      expect(new Set(finalOrders).size).toBe(finalOrders.length);
    });
  });
});
