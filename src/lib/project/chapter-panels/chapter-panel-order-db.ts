import { readFileSync } from "node:fs";
import path from "node:path";

import { db } from "../../../test-db/harness";
import { splitSqlStatements } from "../../../test-db/manual-sql";

const manualDir = path.resolve("prisma/migrations/manual");

export const migrationFile = "20261128_chapter_panel_order.sql";
export const dryRunFile = "20261128_chapter_panel_order_dry_run.sql";
export const rollbackFile = "20261128_chapter_panel_order_rollback.sql";

const chapterCountKey = "将被重编的章节数";
const panelCountKey = "将补在场角色的分镜数";
const projectCharacterCountKey = "将新增的项目角色数";

export const tiedChapter = "10000000-0000-4000-8000-000000000001";
export const gappedChapter = "10000000-0000-4000-8000-000000000002";
export const stableChapter = "10000000-0000-4000-8000-000000000003";
export const panelT1 = "00000000-0000-4000-8000-000000000001";
export const panelT2 = "00000000-0000-4000-8000-000000000002";
export const panelG1 = "00000000-0000-4000-8000-000000000003";
export const panelG2 = "00000000-0000-4000-8000-000000000004";
export const panelS1 = "00000000-0000-4000-8000-000000000005";
export const panelS2 = "00000000-0000-4000-8000-000000000006";

const sameInstant = new Date("2020-01-01T00:00:00.000Z");

export type CastSnapshot = {
  id: string;
  panel_id: string;
  project_character_id: string | null;
  outfit_id: string | null;
  expression_type: string | null;
  sort_order: number;
};

export type RenumberSeed = {
  newcomerId: string;
  memberId: string;
  memberProjectCharacterId: string;
  outfitId: string;
};

export async function executeSqlFile(fileName: string): Promise<void> {
  const sql = readFileSync(path.join(manualDir, fileName), "utf8");
  for (const statement of splitSqlStatements(sql)) {
    await db.$executeRawUnsafe(statement);
  }
}

export async function dryRunCounts(): Promise<{ chapters: number; panels: number; projectCharacters: number }> {
  const sql = readFileSync(path.join(manualDir, dryRunFile), "utf8");
  const [statement] = splitSqlStatements(sql);
  if (!statement) throw new Error("dry-run 没有语句");
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(statement);
  const row = rows[0];
  if (!row) throw new Error("dry-run 没有返回计数");
  const chapters = row[chapterCountKey];
  const panels = row[panelCountKey];
  const projectCharacters = row[projectCharacterCountKey];
  if (typeof chapters !== "number" || typeof panels !== "number" || typeof projectCharacters !== "number") {
    throw new Error("dry-run 计数不是数字");
  }
  return { chapters, panels, projectCharacters };
}

export async function reading(chapterId: string): Promise<Array<{ id: string; panel_order: number }>> {
  return db.panel.findMany({
    where: { chapter_id: chapterId },
    orderBy: [{ panel_order: "asc" }, { id: "asc" }],
    select: { id: true, panel_order: true },
  });
}

export async function seedProject(label: string): Promise<{ userId: string; projectId: string }> {
  const user = await db.user.create({ data: { email: `${label}@example.com` } });
  const project = await db.project.create({
    data: { user_id: user.id, title: label },
  });
  return { userId: user.id, projectId: project.id };
}

export async function castSnapshots(): Promise<CastSnapshot[]> {
  return db.panelCharacter.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      panel_id: true,
      project_character_id: true,
      outfit_id: true,
      expression_type: true,
      sort_order: true,
    },
  });
}

/** 旧迁移夹具要写下当时还允许的主角色列。约束开启后，这两下写入要先关掉拒绝触发器。 */
export async function withoutLeadGuard<T>(work: () => Promise<T>): Promise<T> {
  await db.$executeRawUnsafe("ALTER TABLE panels DISABLE TRIGGER trg_panels_reject_inconsistent_lead");
  try {
    return await work();
  } finally {
    await db.$executeRawUnsafe("ALTER TABLE panels ENABLE TRIGGER trg_panels_reject_inconsistent_lead");
  }
}

/**
 * 夹具里有重复编号时不能在同一事务里重新打开触发器。
 * 延迟唯一检查还挂着，ALTER TABLE 会报 pending trigger events。
 * 测试事务回滚时，这次 DISABLE 会一起撤销。
 */
export async function suspendLeadGuard(): Promise<void> {
  await db.$executeRawUnsafe("ALTER TABLE panels DISABLE TRIGGER trg_panels_reject_inconsistent_lead");
}

export async function seedRenumberCase(): Promise<RenumberSeed> {
  const { userId, projectId } = await seedProject("chapter-panel-order");
  const newcomer = await db.character.create({ data: { user_id: userId, name: "新人" } });
  const member = await db.character.create({ data: { user_id: userId, name: "已在项目" } });
  const outfit = await db.characterOutfit.create({
    data: { character_id: newcomer.id, outfit_name: "校服", outfit_type: "school" },
  });
  const memberRow = await db.projectCharacter.create({
    data: { project_id: projectId, character_id: member.id, role: "protagonist" },
  });

  await db.chapter.createMany({
    data: [
      { id: tiedChapter, project_id: projectId, title: "并列", chapter_order: 1 },
      { id: gappedChapter, project_id: projectId, title: "空号", chapter_order: 2 },
      { id: stableChapter, project_id: projectId, title: "已连号", chapter_order: 3 },
    ],
  });

  await suspendLeadGuard();
  await db.panel.createMany({
    data: [
      {
        id: panelT1,
        project_id: projectId,
        chapter_id: tiedChapter,
        panel_order: 4,
        panel_type: "medium",
        importance: "medium",
        description: "先创建的并列格",
        created_at: sameInstant,
      },
      {
        id: panelT2,
        project_id: projectId,
        chapter_id: tiedChapter,
        panel_order: 4,
        panel_type: "medium",
        importance: "medium",
        description: "后创建的并列格",
        character_id: newcomer.id,
        outfit_id: outfit.id,
        expression_type: "shy",
        created_at: sameInstant,
      },
      {
        id: panelG1,
        project_id: projectId,
        chapter_id: gappedChapter,
        panel_order: 1,
        panel_type: "medium",
        importance: "medium",
        description: "已有项目角色",
        character_id: member.id,
        expression_type: "happy",
        created_at: new Date("2020-01-02T00:00:00.000Z"),
      },
      {
        id: panelG2,
        project_id: projectId,
        chapter_id: gappedChapter,
        panel_order: 3,
        panel_type: "medium",
        importance: "medium",
        description: "空号后的格子",
        character_id: newcomer.id,
        outfit_id: outfit.id,
        expression_type: "shy",
        created_at: new Date("2020-01-03T00:00:00.000Z"),
      },
      {
        id: panelS1,
        project_id: projectId,
        chapter_id: stableChapter,
        panel_order: 1,
        panel_type: "medium",
        importance: "medium",
        description: "已有在场角色",
        character_id: member.id,
        expression_type: "happy",
        created_at: new Date("2020-01-04T00:00:00.000Z"),
      },
      {
        id: panelS2,
        project_id: projectId,
        chapter_id: stableChapter,
        panel_order: 2,
        panel_type: "medium",
        importance: "medium",
        description: "已连号的第二格",
        created_at: new Date("2020-01-05T00:00:00.000Z"),
      },
    ],
  });

  await db.panelCharacter.create({
    data: {
      panel_id: panelS1,
      project_character_id: memberRow.id,
      expression_type: "happy",
      sort_order: 0,
    },
  });

  return {
    newcomerId: newcomer.id,
    memberId: member.id,
    memberProjectCharacterId: memberRow.id,
    outfitId: outfit.id,
  };
}
