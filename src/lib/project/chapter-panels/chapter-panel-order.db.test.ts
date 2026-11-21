import { describe, expect, it } from "vitest";

import { db } from "../../../test-db/harness";
import {
  castSnapshots,
  dryRunCounts,
  executeSqlFile,
  gappedChapter,
  migrationFile,
  panelG1,
  panelG2,
  panelS1,
  panelS2,
  panelT1,
  panelT2,
  reading,
  seedProject,
  seedRenumberCase,
  withoutLeadGuard,
  stableChapter,
  tiedChapter,
} from "./chapter-panel-order-db";

describe("章节重编号迁移", () => {
  it("dry-run 只报出将改动的计数，不写分镜、在场角色或项目角色", async () => {
    const seeded = await seedRenumberCase();
    const beforeOrders = {
      tied: await reading(tiedChapter),
      gapped: await reading(gappedChapter),
      stable: await reading(stableChapter),
    };
    const beforeCast = await castSnapshots();
    const beforeRoles = await db.projectCharacter.findMany({
      orderBy: { character_id: "asc" },
      select: { character_id: true, role: true },
    });

    const counts = await dryRunCounts();

    expect(counts).toEqual({ chapters: 2, panels: 3, projectCharacters: 1 });
    expect(await reading(tiedChapter)).toEqual(beforeOrders.tied);
    expect(await reading(gappedChapter)).toEqual(beforeOrders.gapped);
    expect(await reading(stableChapter)).toEqual(beforeOrders.stable);
    expect(await castSnapshots()).toEqual(beforeCast);
    expect(await db.projectCharacter.findMany({
      orderBy: { character_id: "asc" },
      select: { character_id: true, role: true },
    })).toEqual(beforeRoles);
    expect(beforeRoles).toEqual([{ character_id: seeded.memberId, role: "protagonist" }]);
  });

  it("迁移后每章从 1 连号，并列按创建时间和 id，补上的在场角色可重复执行且第二次无变化", async () => {
    const seeded = await seedRenumberCase();

    await executeSqlFile(migrationFile);

    expect(await reading(tiedChapter)).toEqual([
      { id: panelT1, panel_order: 1 },
      { id: panelT2, panel_order: 2 },
    ]);
    expect(await reading(gappedChapter)).toEqual([
      { id: panelG1, panel_order: 1 },
      { id: panelG2, panel_order: 2 },
    ]);
    expect(await reading(stableChapter)).toEqual([
      { id: panelS1, panel_order: 1 },
      { id: panelS2, panel_order: 2 },
    ]);

    const newcomerRows = await db.projectCharacter.findMany({
      where: { character_id: seeded.newcomerId },
    });
    expect(newcomerRows).toHaveLength(1);
    expect(newcomerRows[0]?.role).toBe("minor");
    const memberRow = await db.projectCharacter.findUnique({
      where: { id: seeded.memberProjectCharacterId },
    });
    expect(memberRow?.role).toBe("protagonist");

    const t2Cast = await db.panelCharacter.findMany({ where: { panel_id: panelT2 } });
    const g2Cast = await db.panelCharacter.findMany({ where: { panel_id: panelG2 } });
    const g1Cast = await db.panelCharacter.findMany({ where: { panel_id: panelG1 } });
    expect(t2Cast).toHaveLength(1);
    expect(g2Cast).toHaveLength(1);
    expect(t2Cast[0]?.project_character_id).toBe(newcomerRows[0]?.id);
    expect(g2Cast[0]?.project_character_id).toBe(newcomerRows[0]?.id);
    expect(t2Cast[0]?.outfit_id).toBe(seeded.outfitId);
    expect(t2Cast[0]?.expression_type).toBe("shy");
    expect(t2Cast[0]?.sort_order).toBe(0);
    expect(g1Cast).toEqual([
      expect.objectContaining({
        project_character_id: seeded.memberProjectCharacterId,
        outfit_id: null,
        expression_type: "happy",
        sort_order: 0,
      }),
    ]);

    const lead = await db.panel.findUnique({ where: { id: panelT2 } });
    expect(lead?.character_id).toBe(seeded.newcomerId);
    expect(lead?.outfit_id).toBe(seeded.outfitId);
    expect(lead?.expression_type).toBe("shy");
    expect(await dryRunCounts()).toEqual({ chapters: 0, panels: 0, projectCharacters: 0 });

    const ordersAfter = {
      tied: await reading(tiedChapter),
      gapped: await reading(gappedChapter),
      stable: await reading(stableChapter),
    };
    const castAfter = await castSnapshots();
    const rolesAfter = await db.projectCharacter.findMany({
      orderBy: { character_id: "asc" },
      select: { character_id: true, role: true },
    });

    await executeSqlFile(migrationFile);

    expect(await reading(tiedChapter)).toEqual(ordersAfter.tied);
    expect(await reading(gappedChapter)).toEqual(ordersAfter.gapped);
    expect(await reading(stableChapter)).toEqual(ordersAfter.stable);
    expect(await castSnapshots()).toEqual(castAfter);
    expect(await db.projectCharacter.findMany({
      orderBy: { character_id: "asc" },
      select: { character_id: true, role: true },
    })).toEqual(rolesAfter);
  });

  it("只有待绑定行的主角色也会补上在场角色，已有定位不变，第二次无变化", async () => {
    const { userId, projectId } = await seedProject("chapter-panel-pending-backfill");
    const newcomer = await db.character.create({ data: { user_id: userId, name: "待补" } });
    const outfit = await db.characterOutfit.create({
      data: { character_id: newcomer.id, outfit_name: "外套", outfit_type: "casual" },
    });
    const member = await db.character.create({ data: { user_id: userId, name: "已有定位" } });
    const memberRow = await db.projectCharacter.create({
      data: { project_id: projectId, character_id: member.id, role: "protagonist" },
    });
    const chapter = await db.chapter.create({
      data: { project_id: projectId, title: "待绑定", chapter_order: 1 },
    });
    const pendingPanel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: chapter.id,
        panel_order: 1,
        panel_type: "medium",
        importance: "medium",
        description: "只有待绑定",
      },
    });
    const memberPanel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: chapter.id,
        panel_order: 2,
        panel_type: "medium",
        importance: "medium",
        description: "已有定位但只有待绑定",
      },
    });
    await db.panelCharacter.create({
      data: {
        panel_id: pendingPanel.id,
        pending_character_key: "unbound-a",
        pending_character_name: "路人",
        expression_type: "angry",
        sort_order: 0,
      },
    });
    await db.panelCharacter.create({
      data: {
        panel_id: memberPanel.id,
        pending_character_key: "unbound-b",
        pending_character_name: "路人乙",
        sort_order: 0,
      },
    });
    await withoutLeadGuard(async () => {
      await db.panel.update({
        where: { id: pendingPanel.id },
        data: { character_id: newcomer.id, outfit_id: outfit.id, expression_type: "shy" },
      });
      await db.panel.update({
        where: { id: memberPanel.id },
        data: { character_id: member.id, expression_type: "happy" },
      });
    });

    expect(await dryRunCounts()).toEqual({ chapters: 0, panels: 2, projectCharacters: 1 });

    await executeSqlFile(migrationFile);

    const added = await db.projectCharacter.findMany({ where: { character_id: newcomer.id } });
    expect(added).toHaveLength(1);
    expect(added[0]?.role).toBe("minor");
    expect((await db.projectCharacter.findUnique({ where: { id: memberRow.id } }))?.role).toBe("protagonist");

    const realCast = await db.panelCharacter.findMany({
      where: { panel_id: pendingPanel.id, project_character_id: { not: null } },
    });
    expect(realCast).toEqual([
      expect.objectContaining({
        project_character_id: added[0]?.id,
        outfit_id: outfit.id,
        expression_type: "shy",
        sort_order: 0,
      }),
    ]);
    const lead = await db.panel.findUnique({ where: { id: pendingPanel.id } });
    expect(lead?.character_id).toBe(newcomer.id);
    expect(lead?.outfit_id).toBe(outfit.id);
    expect(lead?.expression_type).toBe("shy");
    const memberLead = await db.panel.findUnique({ where: { id: memberPanel.id } });
    expect(memberLead?.character_id).toBe(member.id);
    expect(memberLead?.expression_type).toBe("happy");
    expect(await dryRunCounts()).toEqual({ chapters: 0, panels: 0, projectCharacters: 0 });

    const castAfter = await castSnapshots();
    await executeSqlFile(migrationFile);
    expect(await castSnapshots()).toEqual(castAfter);
    expect((await db.projectCharacter.findUnique({ where: { id: memberRow.id } }))?.role).toBe("protagonist");
  });
});
