/**
 * 项目根对齐 阶段 1 回填：把 Story 的设定、章节、角色关系回填到 Project 上
 *
 * 用法：
 *   npx tsx scripts/migrate-story-to-project.ts           预演（只读，默认）
 *   npx tsx scripts/migrate-story-to-project.ts --apply   在单个事务中写入
 *
 * 前置：写入前必须先执行 prisma/migrations/manual/20261118_project_root_phase1.sql。
 * 预演在迁移执行前也可以运行，此时按"新字段全部为空"计算变更。
 * 幂等：重复执行不会产生新的变更。阶段 1 中 Story 仍是设定的权威来源，所以会用 Story 的值覆盖 Project。
 * 背景：docs/plans/2026-11-18-project-root-alignment-plan.md
 */
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

interface ProjectSettings {
  genre: string | null;
  premise: string | null;
  outline: Prisma.JsonValue | null;
  template_id: string | null;
  comic_style_id: string | null;
  style_reference_image: string | null;
  is_serialized: boolean;
  serial_status: string | null;
  is_sample: boolean;
  sample_category: string | null;
  source_type: string | null;
  source_novel_id: string | null;
}

const emptySettings: ProjectSettings = {
  genre: null,
  premise: null,
  outline: null,
  template_id: null,
  comic_style_id: null,
  style_reference_image: null,
  is_serialized: false,
  serial_status: null,
  is_sample: false,
  sample_category: null,
  source_type: null,
  source_novel_id: null,
};

interface ProjectCreate {
  id: string;
  storyId: string;
  storyTitle: string;
  userId: string;
  settings: ProjectSettings;
}

interface ProjectUpdate {
  projectId: string;
  storyTitle: string;
  settings: ProjectSettings;
}

interface Link {
  id: string;
  projectId: string;
}

interface CastUpsert {
  projectId: string;
  characterId: string;
  role: string;
  characterArc: string | null;
  displayOrder: number;
  source: "story" | "panel";
}

interface Plan {
  creates: ProjectCreate[];
  updates: ProjectUpdate[];
  chapterLinks: Link[];
  suggestedLinks: Link[];
  cast: CastUpsert[];
  timelineLinks: Link[];
  ambiguousTimelines: string[];
  unmatchedTimelines: string[];
}

// jsonb 不保留键顺序，比较前按键排序
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function sameSettings(a: ProjectSettings, b: ProjectSettings): boolean {
  return stableStringify(a) === stableStringify(b);
}

function toSettingsData(s: ProjectSettings): Prisma.ProjectUncheckedUpdateInput {
  return {
    ...s,
    outline: s.outline === null ? Prisma.DbNull : (s.outline as Prisma.InputJsonValue),
  };
}

async function isPhase1Applied(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ ok: boolean }[]>`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = current_schema() AND table_name = 'project_characters')
      AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = 'chapters' AND column_name = 'project_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema() AND table_name = 'projects' AND column_name = 'source_novel_id')
      AS ok`;
  return rows[0]?.ok === true;
}

async function buildPlan(phase1Applied: boolean): Promise<Plan> {
  const stories = await prisma.story.findMany({
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      user_id: true,
      title: true,
      premise: true,
      genre: true,
      outline: true,
      template_id: true,
      comic_style_id: true,
      style_reference_image: true,
      is_serialized: true,
      serial_status: true,
      is_sample: true,
      sample_category: true,
      source_type: true,
      source_novel_id: true,
      projects: { select: { id: true }, orderBy: { updated_at: "desc" } },
      chapters: { select: { id: true } },
      story_characters: {
        select: { character_id: true, role: true, character_arc: true, display_order: true },
      },
      suggested_characters_list: { select: { id: true } },
    },
  });

  const multi = stories.filter((s) => s.projects.length > 1);
  if (multi.length > 0) {
    throw new Error(
      `存在对应多个 Project 的 Story，需要先人工决定归属：${multi.map((s) => `${s.id}(${s.title})`).join(", ")}`
    );
  }

  // 迁移未执行时新列不存在，当前状态按空值处理
  const currentSettings = new Map<string, ProjectSettings>();
  const chapterProject = new Map<string, string | null>();
  const suggestedProject = new Map<string, string | null>();
  const existingCast = new Map<string, { role: string; character_arc: string | null; display_order: number }>();
  const timelineProject = new Map<string, string | null>();

  if (phase1Applied) {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        genre: true,
        premise: true,
        outline: true,
        template_id: true,
        comic_style_id: true,
        style_reference_image: true,
        is_serialized: true,
        serial_status: true,
        is_sample: true,
        sample_category: true,
        source_type: true,
        source_novel_id: true,
      },
    });
    for (const { id, ...settings } of projects) currentSettings.set(id, settings);

    for (const c of await prisma.chapter.findMany({ select: { id: true, project_id: true } })) {
      chapterProject.set(c.id, c.project_id);
    }
    for (const s of await prisma.suggestedCharacter.findMany({ select: { id: true, project_id: true } })) {
      suggestedProject.set(s.id, s.project_id);
    }
    for (const pc of await prisma.projectCharacter.findMany({
      select: { project_id: true, character_id: true, role: true, character_arc: true, display_order: true },
    })) {
      existingCast.set(`${pc.project_id}:${pc.character_id}`, pc);
    }
    for (const t of await prisma.canvasTimeline.findMany({ select: { id: true, project_id: true } })) {
      timelineProject.set(t.id, t.project_id);
    }
  }

  const plan: Plan = {
    creates: [],
    updates: [],
    chapterLinks: [],
    suggestedLinks: [],
    cast: [],
    timelineLinks: [],
    ambiguousTimelines: [],
    unmatchedTimelines: [],
  };

  // 回填后每个项目的来源小说与所属用户，用于匹配画布时间线
  const projectSource = new Map<string, { userId: string; novelId: string | null }>();
  const castOrder = new Map<string, number>();

  for (const story of stories) {
    const settings: ProjectSettings = {
      genre: story.genre,
      premise: story.premise,
      outline: story.outline,
      template_id: story.template_id,
      comic_style_id: story.comic_style_id,
      style_reference_image: story.style_reference_image,
      is_serialized: story.is_serialized,
      serial_status: story.serial_status,
      is_sample: story.is_sample,
      sample_category: story.sample_category,
      source_type: story.source_type,
      source_novel_id: story.source_novel_id,
    };

    let projectId: string;
    if (story.projects.length === 0) {
      projectId = randomUUID();
      plan.creates.push({ id: projectId, storyId: story.id, storyTitle: story.title, userId: story.user_id, settings });
    } else {
      projectId = story.projects[0].id;
      if (!sameSettings(currentSettings.get(projectId) ?? emptySettings, settings)) {
        plan.updates.push({ projectId, storyTitle: story.title, settings });
      }
    }
    projectSource.set(projectId, { userId: story.user_id, novelId: story.source_novel_id });

    for (const c of story.chapters) {
      if (chapterProject.get(c.id) !== projectId) plan.chapterLinks.push({ id: c.id, projectId });
    }
    for (const s of story.suggested_characters_list) {
      if (suggestedProject.get(s.id) !== projectId) plan.suggestedLinks.push({ id: s.id, projectId });
    }

    let maxOrder = -1;
    for (const sc of story.story_characters) {
      maxOrder = Math.max(maxOrder, sc.display_order);
      const existing = existingCast.get(`${projectId}:${sc.character_id}`);
      const same =
        existing &&
        existing.role === sc.role &&
        existing.character_arc === sc.character_arc &&
        existing.display_order === sc.display_order;
      if (!same) {
        plan.cast.push({
          projectId,
          characterId: sc.character_id,
          role: sc.role,
          characterArc: sc.character_arc,
          displayOrder: sc.display_order,
          source: "story",
        });
      }
      existingCast.set(`${projectId}:${sc.character_id}`, {
        role: sc.role,
        character_arc: sc.character_arc,
        display_order: sc.display_order,
      });
    }
    castOrder.set(projectId, maxOrder);
  }

  // 分镜已绑定、但不在项目角色中的角色，补为龙套
  const panelCast = await prisma.panel.findMany({
    where: { character_id: { not: null } },
    distinct: ["project_id", "character_id"],
    select: { project_id: true, character_id: true },
    orderBy: [{ project_id: "asc" }, { panel_order: "asc" }],
  });
  for (const pc of panelCast) {
    if (!pc.character_id) continue;
    const key = `${pc.project_id}:${pc.character_id}`;
    if (existingCast.has(key)) continue;
    let order = castOrder.get(pc.project_id);
    if (order === undefined) {
      const orders = [...existingCast.entries()]
        .filter(([k]) => k.startsWith(`${pc.project_id}:`))
        .map(([, v]) => v.display_order);
      order = orders.length > 0 ? Math.max(...orders) : -1;
    }
    order += 1;
    castOrder.set(pc.project_id, order);
    plan.cast.push({
      projectId: pc.project_id,
      characterId: pc.character_id,
      role: "minor",
      characterArc: null,
      displayOrder: order,
      source: "panel",
    });
    existingCast.set(key, { role: "minor", character_arc: null, display_order: order });
  }

  // 画布时间线只在同一用户下恰好有一个来源项目时自动关联
  const timelines = await prisma.canvasTimeline.findMany({
    select: { id: true, novel_project_id: true, user_id: true },
  });
  for (const t of timelines) {
    if (timelineProject.get(t.id)) continue;
    const candidates = [...projectSource.entries()]
      .filter(([, src]) => src.userId === t.user_id && src.novelId === t.novel_project_id)
      .map(([id]) => id);
    if (candidates.length === 1) plan.timelineLinks.push({ id: t.id, projectId: candidates[0] });
    else if (candidates.length > 1) plan.ambiguousTimelines.push(t.id);
    else plan.unmatchedTimelines.push(t.id);
  }

  return plan;
}

async function applyPlan(plan: Plan): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      for (const c of plan.creates) {
        await tx.project.create({
          data: {
            id: c.id,
            user_id: c.userId,
            story_id: c.storyId,
            title: c.storyTitle,
            ...toSettingsData(c.settings),
          } as Prisma.ProjectUncheckedCreateInput,
        });
      }
      for (const u of plan.updates) {
        await tx.project.update({ where: { id: u.projectId }, data: toSettingsData(u.settings) });
      }
      for (const l of plan.chapterLinks) {
        await tx.chapter.update({ where: { id: l.id }, data: { project_id: l.projectId } });
      }
      for (const l of plan.suggestedLinks) {
        await tx.suggestedCharacter.update({ where: { id: l.id }, data: { project_id: l.projectId } });
      }
      for (const m of plan.cast) {
        const data = { role: m.role, character_arc: m.characterArc, display_order: m.displayOrder };
        await tx.projectCharacter.upsert({
          where: { project_id_character_id: { project_id: m.projectId, character_id: m.characterId } },
          create: { project_id: m.projectId, character_id: m.characterId, ...data },
          update: { ...data, updated_at: new Date() },
        });
      }
      for (const l of plan.timelineLinks) {
        await tx.canvasTimeline.update({ where: { id: l.id }, data: { project_id: l.projectId } });
      }

      // 不变量：分镜的项目与其章节的项目一致，且每个故事章节都已归属项目
      const [check] = await tx.$queryRaw<{ mismatched: bigint; unlinked: bigint }[]>`
        SELECT
          (SELECT COUNT(*) FROM panels pn JOIN chapters c ON c.id = pn.chapter_id
            WHERE c.project_id IS DISTINCT FROM pn.project_id) AS mismatched,
          (SELECT COUNT(*) FROM chapters WHERE project_id IS NULL) AS unlinked`;
      if (Number(check.mismatched) > 0 || Number(check.unlinked) > 0) {
        throw new Error(
          `回填后校验失败：章节与分镜项目不一致 ${check.mismatched} 条，未归属项目的章节 ${check.unlinked} 条，已回滚`
        );
      }
    },
    { timeout: 120_000 }
  );
}

function report(plan: Plan, phase1Applied: boolean): void {
  console.log(`模式：${apply ? "写入" : "预演（不写入）"}；阶段 1 迁移${phase1Applied ? "已" : "未"}执行`);
  console.table([
    { 项: "新建项目（Story 原本没有 Project）", 数量: plan.creates.length },
    { 项: "更新项目设定", 数量: plan.updates.length },
    { 项: "章节关联项目", 数量: plan.chapterLinks.length },
    { 项: "建议角色关联项目", 数量: plan.suggestedLinks.length },
    { 项: "项目角色（来自故事角色）", 数量: plan.cast.filter((c) => c.source === "story").length },
    { 项: "项目角色（来自分镜绑定，补为龙套）", 数量: plan.cast.filter((c) => c.source === "panel").length },
    { 项: "画布时间线关联项目", 数量: plan.timelineLinks.length },
    { 项: "画布时间线有多个候选项目（跳过）", 数量: plan.ambiguousTimelines.length },
    { 项: "画布时间线没有候选项目（跳过）", 数量: plan.unmatchedTimelines.length },
  ]);
  for (const c of plan.creates) console.log(`  新建项目：${c.storyTitle}（story ${c.storyId} -> project ${c.id}）`);
  for (const id of plan.ambiguousTimelines) console.log(`  需人工选择项目的时间线：${id}`);
}

async function main(): Promise<void> {
  const phase1Applied = await isPhase1Applied();
  if (apply && !phase1Applied) {
    throw new Error("请先执行 prisma/migrations/manual/20261118_project_root_phase1.sql");
  }

  const plan = await buildPlan(phase1Applied);
  report(plan, phase1Applied);

  if (apply) {
    await applyPlan(plan);
    console.log("写入完成。再次运行预演应显示全部为 0（跳过的时间线除外）。");
  }
}

main()
  .catch((error: unknown) => {
    console.error("回填失败:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
