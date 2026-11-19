/**
 * 阶段 5c-1 回填：已归属项目的画布时间线，把时间线章节锚定到项目章节
 *
 * 用法：
 *   npx tsx scripts/backfill-timeline-anchors.ts           预演（在事务中执行后回滚，输出准确计数）
 *   npx tsx scripts/backfill-timeline-anchors.ts --apply   写入
 *
 * 前置：prisma/migrations/manual/20261121_canvas_anchor_phase5c1.sql 已执行。可重复执行。
 * 阶段 5c-2 迁移执行后，锚定会由触发器同步剧本片段的 chapter_id，脚本末尾输出一致性审计。
 */
import { PrismaClient } from "@prisma/client";
import { anchorTimelineChapters } from "../src/lib/project/timeline-anchor";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

class DryRunRollback extends Error {}

interface Row {
  timelineId: string;
  projectId: string;
  anchored: number;
  created: number;
  skipped: number;
}

async function main() {
  const rows: Row[] = [];
  try {
    await prisma.$transaction(
      async (tx) => {
        const timelines = await tx.canvasTimeline.findMany({
          where: { project_id: { not: null } },
          select: { id: true, project_id: true },
          orderBy: { created_at: "asc" },
        });
        for (const t of timelines) {
          const r = await anchorTimelineChapters(tx, t.id);
          rows.push({ timelineId: t.id, projectId: t.project_id as string, ...r });
        }
        if (!apply) throw new DryRunRollback();
      },
      { timeout: 120_000 }
    );
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }

  const unlinked = await prisma.canvasTimeline.count({ where: { project_id: null } });
  const sum = (k: "anchored" | "created" | "skipped") => rows.reduce((n, r) => n + r[k], 0);

  console.log(`模式：${apply ? "写入" : "预演（已回滚）"}`);
  console.table([
    { 项: "已归属项目的时间线", 数量: rows.length },
    { 项: "未归属项目的时间线（跳过）", 数量: unlinked },
    { 项: "锚定的时间线章节", 数量: sum("anchored") },
    { 项: "新建的项目章节", 数量: sum("created") },
    { 项: "来源小说章节已删除（跳过）", 数量: sum("skipped") },
  ]);
  for (const r of rows.filter((x) => x.anchored + x.skipped > 0)) {
    console.log(`  ${r.timelineId} -> 项目 ${r.projectId}：锚定 ${r.anchored}，新建 ${r.created}，跳过 ${r.skipped}`);
  }

  const [segments] = await prisma.$queryRaw<Array<{ total: bigint; linked: bigint; mismatched: bigint }>>`
    SELECT COUNT(*)::bigint AS total,
           COUNT(s.chapter_id)::bigint AS linked,
           COUNT(*) FILTER (WHERE s.chapter_id IS DISTINCT FROM tc.project_chapter_id)::bigint AS mismatched
    FROM script_segments s
    JOIN timeline_chapters tc ON tc.id = s.timeline_chapter_id`;
  console.log("剧本片段审计（当前库，不含预演变更）：");
  console.table([
    { 项: "剧本片段总数", 数量: Number(segments.total) },
    { 项: "已挂到项目章节", 数量: Number(segments.linked) },
    { 项: "与时间线章节锚点不一致（应为 0）", 数量: Number(segments.mismatched) },
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
