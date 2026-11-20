import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { db } from "../../../test-db/harness";
import { seedProject } from "./chapter-panel-order-db";
import { panels } from "./write";

describe("章节分镜模块写入", () => {
  it("新分镜恰有一行流程状态，在场角色决定主角色，清空后主角色字段也清空", async () => {
    const { userId, projectId } = await seedProject("chapter-panels-write");
    const character = await db.character.create({ data: { user_id: userId, name: "甲" } });
    const outfit = await db.characterOutfit.create({
      data: { character_id: character.id, outfit_name: "常服", outfit_type: "casual" },
    });
    const projectCharacter = await db.projectCharacter.create({
      data: { project_id: projectId, character_id: character.id, role: "supporting" },
    });
    const chapter = await db.chapter.create({
      data: { project_id: projectId, title: "第一章", chapter_order: 1 },
    });
    const writer = panels(projectId, { tx: db });

    const created = await writer.add(
      { panelType: "dialogue", description: "对白" },
      { chapter: chapter.id },
    );
    const panelId = created[0]?.id;
    expect(panelId).toBeTruthy();
    if (!panelId) return;

    const states = await db.panelPipelineState.findMany({ where: { panel_id: panelId } });
    expect(states).toHaveLength(1);
    const born = await db.panel.findUnique({ where: { id: panelId } });
    expect(born?.project_id).toBe(projectId);
    expect(born?.chapter_id).toBe(chapter.id);
    expect(born?.panel_order).toBe(1);
    expect(born?.character_id).toBeNull();
    expect(born?.outfit_id).toBeNull();
    expect(born?.expression_type).toBeNull();

    await writer.setCast(panelId, [{
      projectCharacterId: projectCharacter.id,
      outfitId: outfit.id,
      expression: "shy",
    }]);
    const withLead = await db.panel.findUnique({ where: { id: panelId } });
    expect(withLead?.character_id).toBe(character.id);
    expect(withLead?.outfit_id).toBe(outfit.id);
    expect(withLead?.expression_type).toBe("shy");

    await writer.setCast(panelId, []);
    const cleared = await db.panel.findUnique({ where: { id: panelId } });
    expect(cleared?.character_id).toBeNull();
    expect(cleared?.outfit_id).toBeNull();
    expect(cleared?.expression_type).toBeNull();
    const cast = await db.panelCharacter.findMany({ where: { panel_id: panelId } });
    expect(cast).toEqual([]);
  });

  it("并发向同一章节添加不产生重复编号，每个新分镜恰有一行流程状态", async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error("数据库测试需要 TEST_DATABASE_URL");
    const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let projectId = "";
    let userId = "";

    try {
      const user = await client.user.create({ data: { email: `chapter-panels-concurrent-${stamp}@example.com` } });
      userId = user.id;
      const project = await client.project.create({
        data: { user_id: user.id, title: `并发 ${stamp}` },
      });
      projectId = project.id;
      const chapter = await client.chapter.create({
        data: { project_id: project.id, title: "第一章", chapter_order: 1 },
      });
      const writer = panels(project.id, { db: client });

      const [first, second] = await Promise.all([
        writer.add({ panelType: "medium", description: "甲" }, { chapter: chapter.id }),
        writer.add({ panelType: "closeup", description: "乙" }, { chapter: chapter.id }),
      ]);

      const rows = await client.panel.findMany({
        where: { chapter_id: chapter.id },
        orderBy: { panel_order: "asc" },
        select: { id: true, panel_order: true, project_id: true },
      });
      expect(rows.map((row) => row.panel_order)).toEqual([1, 2]);
      expect(rows.map((row) => row.project_id)).toEqual([project.id, project.id]);
      expect(new Set(rows.map((row) => row.id))).toEqual(new Set([first[0]?.id, second[0]?.id]));

      const states = await client.panelPipelineState.findMany({
        where: { panel_id: { in: rows.map((row) => row.id) } },
      });
      expect(states).toHaveLength(2);
      expect(new Set(states.map((state) => state.panel_id))).toEqual(new Set(rows.map((row) => row.id)));
    } finally {
      if (projectId) await client.project.delete({ where: { id: projectId } });
      if (userId) await client.user.delete({ where: { id: userId } });
      await client.$disconnect();
    }
  });
});
