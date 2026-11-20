import { describe, expect, it } from "vitest";

import { db } from "../../../test-db/harness";
import { seedProject } from "./chapter-panel-order-db";

describe("在场角色决定主角色", () => {
  it("补上在场角色后，主角色、服装和表情等于这一位；待绑定角色不占主角色", async () => {
    const { userId, projectId } = await seedProject("chapter-panel-lead-add");
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
    const panel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: chapter.id,
        panel_order: 1,
        panel_type: "medium",
        importance: "medium",
        description: "空镜",
      },
    });

    await db.panelCharacter.create({
      data: {
        panel_id: panel.id,
        pending_character_key: "unbound-passerby",
        pending_character_name: "路人",
        expression_type: "angry",
        sort_order: 0,
      },
    });
    const afterPending = await db.panel.findUnique({ where: { id: panel.id } });
    expect(afterPending?.character_id).toBeNull();
    expect(afterPending?.outfit_id).toBeNull();
    expect(afterPending?.expression_type).toBeNull();

    const cast = await db.panelCharacter.create({
      data: {
        panel_id: panel.id,
        project_character_id: projectCharacter.id,
        outfit_id: outfit.id,
        expression_type: "shy",
        sort_order: 1,
      },
    });
    const afterCast = await db.panel.findUnique({ where: { id: panel.id } });
    expect(afterCast?.character_id).toBe(character.id);
    expect(afterCast?.outfit_id).toBe(outfit.id);
    expect(afterCast?.expression_type).toBe("shy");

    await db.panelCharacter.update({
      where: { id: cast.id },
      data: { expression_type: "happy", outfit_id: null },
    });
    const afterEdit = await db.panel.findUnique({ where: { id: panel.id } });
    expect(afterEdit?.character_id).toBe(character.id);
    expect(afterEdit?.outfit_id).toBeNull();
    expect(afterEdit?.expression_type).toBe("happy");
  });

  it("删掉第一位在场角色后，主角色改成下一位；都删掉后主角色字段清空", async () => {
    const { userId, projectId } = await seedProject("chapter-panel-lead-delete");
    const first = await db.character.create({ data: { user_id: userId, name: "甲" } });
    const second = await db.character.create({ data: { user_id: userId, name: "乙" } });
    const firstRow = await db.projectCharacter.create({
      data: { project_id: projectId, character_id: first.id, role: "supporting" },
    });
    const secondRow = await db.projectCharacter.create({
      data: { project_id: projectId, character_id: second.id, role: "minor" },
    });
    const chapter = await db.chapter.create({
      data: { project_id: projectId, title: "第一章", chapter_order: 1 },
    });
    const panel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: chapter.id,
        panel_order: 1,
        panel_type: "closeup",
        importance: "high",
        description: "双人",
      },
    });
    const firstCast = await db.panelCharacter.create({
      data: {
        panel_id: panel.id,
        project_character_id: firstRow.id,
        expression_type: "happy",
        sort_order: 0,
      },
    });
    await db.panelCharacter.create({
      data: {
        panel_id: panel.id,
        project_character_id: secondRow.id,
        expression_type: "angry",
        sort_order: 1,
      },
    });

    await db.panelCharacter.delete({ where: { id: firstCast.id } });
    const afterDelete = await db.panel.findUnique({ where: { id: panel.id } });
    expect(afterDelete?.character_id).toBe(second.id);
    expect(afterDelete?.expression_type).toBe("angry");
    expect(afterDelete?.outfit_id).toBeNull();

    await db.panelCharacter.deleteMany({ where: { panel_id: panel.id } });
    const cleared = await db.panel.findUnique({ where: { id: panel.id } });
    expect(cleared?.character_id).toBeNull();
    expect(cleared?.outfit_id).toBeNull();
    expect(cleared?.expression_type).toBeNull();
  });

  it("调序后主角色改成新的第一位", async () => {
    const { userId, projectId } = await seedProject("chapter-panel-lead-reorder");
    const first = await db.character.create({ data: { user_id: userId, name: "甲" } });
    const second = await db.character.create({ data: { user_id: userId, name: "乙" } });
    const firstOutfit = await db.characterOutfit.create({
      data: { character_id: first.id, outfit_name: "甲的衣服", outfit_type: "casual" },
    });
    const secondOutfit = await db.characterOutfit.create({
      data: { character_id: second.id, outfit_name: "乙的衣服", outfit_type: "formal" },
    });
    const firstRow = await db.projectCharacter.create({
      data: { project_id: projectId, character_id: first.id, role: "supporting" },
    });
    const secondRow = await db.projectCharacter.create({
      data: { project_id: projectId, character_id: second.id, role: "minor" },
    });
    const chapter = await db.chapter.create({
      data: { project_id: projectId, title: "第一章", chapter_order: 1 },
    });
    const panel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: chapter.id,
        panel_order: 1,
        panel_type: "medium",
        importance: "medium",
        description: "换序",
      },
    });
    const firstCast = await db.panelCharacter.create({
      data: {
        panel_id: panel.id,
        project_character_id: firstRow.id,
        outfit_id: firstOutfit.id,
        expression_type: "happy",
        sort_order: 0,
      },
    });
    const secondCast = await db.panelCharacter.create({
      data: {
        panel_id: panel.id,
        project_character_id: secondRow.id,
        outfit_id: secondOutfit.id,
        expression_type: "sad",
        sort_order: 1,
      },
    });

    await db.panelCharacter.update({ where: { id: firstCast.id }, data: { sort_order: 2 } });
    const reordered = await db.panel.findUnique({ where: { id: panel.id } });
    expect(reordered?.character_id).toBe(second.id);
    expect(reordered?.outfit_id).toBe(secondOutfit.id);
    expect(reordered?.expression_type).toBe("sad");

    await db.panelCharacter.update({ where: { id: secondCast.id }, data: { sort_order: 3 } });
    const restored = await db.panel.findUnique({ where: { id: panel.id } });
    expect(restored?.character_id).toBe(first.id);
    expect(restored?.outfit_id).toBe(firstOutfit.id);
    expect(restored?.expression_type).toBe("happy");
  });
});
