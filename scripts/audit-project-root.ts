/**
 * 阶段 0 数据审计：项目根对齐（Story -> Project）前的只读统计
 *
 * 用法：npx tsx scripts/audit-project-root.ts
 * 全部查询在只读事务中执行，不修改任何数据。
 * 背景见 docs/plans/2026-11-18-project-root-alignment-plan.md
 */
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, unknown>;

interface AuditQuery {
  title: string;
  query: Prisma.Sql;
}

const queries: AuditQuery[] = [
  {
    title: "1. 基础计数",
    query: Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM stories)            AS stories,
        (SELECT COUNT(*) FROM projects)           AS projects,
        (SELECT COUNT(*) FROM chapters)           AS chapters,
        (SELECT COUNT(*) FROM panels)             AS panels,
        (SELECT COUNT(*) FROM characters)         AS characters,
        (SELECT COUNT(*) FROM story_characters)   AS story_characters,
        (SELECT COUNT(*) FROM suggested_characters) AS suggested_characters,
        (SELECT COUNT(*) FROM story_scripts)      AS story_scripts,
        (SELECT COUNT(*) FROM novel_projects)     AS novel_projects,
        (SELECT COUNT(*) FROM canvas_timelines)   AS canvas_timelines`,
  },
  {
    title: "2. 每个 Story 拥有的 Project 数量分布",
    query: Prisma.sql`
      SELECT bucket, COUNT(*) AS stories
      FROM (
        SELECT s.id,
          CASE COUNT(p.id) WHEN 0 THEN '0' WHEN 1 THEN '1' ELSE '2+' END AS bucket
        FROM stories s
        LEFT JOIN projects p ON p.story_id = s.id
        GROUP BY s.id
      ) t
      GROUP BY bucket
      ORDER BY bucket`,
  },
  {
    title: "3. 拥有多个 Project 的 Story 明细（前 20）",
    query: Prisma.sql`
      SELECT s.id AS story_id, s.title,
        COUNT(p.id) AS projects,
        SUM((SELECT COUNT(*) FROM panels pn WHERE pn.project_id = p.id)) AS panels
      FROM stories s
      JOIN projects p ON p.story_id = s.id
      GROUP BY s.id, s.title
      HAVING COUNT(p.id) > 1
      ORDER BY COUNT(p.id) DESC
      LIMIT 20`,
  },
  {
    title: "4. 没有 story_id 的 Project",
    query: Prisma.sql`
      SELECT COUNT(*) AS projects,
        COALESCE(SUM((SELECT COUNT(*) FROM panels pn WHERE pn.project_id = p.id)), 0) AS panels
      FROM projects p
      WHERE p.story_id IS NULL`,
  },
  {
    title: "5. 分镜的章节归属与项目归属不一致",
    query: Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE p.story_id IS NULL)                    AS project_without_story,
        COUNT(*) FILTER (WHERE p.story_id IS NOT NULL
                           AND c.story_id <> p.story_id)              AS chapter_in_other_story
      FROM panels pn
      JOIN projects p ON p.id = pn.project_id
      JOIN chapters c ON c.id = pn.chapter_id`,
  },
  {
    title: "6. 没有 chapter_id 的分镜（按项目是否有故事章节区分）",
    query: Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM chapters c WHERE c.story_id = p.story_id))    AS story_has_chapters,
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM chapters c WHERE c.story_id = p.story_id))    AS story_without_chapters
      FROM panels pn
      JOIN projects p ON p.id = pn.project_id
      WHERE pn.chapter_id IS NULL`,
  },
  {
    title: "7. 角色被多少个 Story 引用",
    query: Prisma.sql`
      SELECT bucket, COUNT(*) AS characters
      FROM (
        SELECT ch.id,
          CASE COUNT(sc.id) WHEN 0 THEN '0' WHEN 1 THEN '1' ELSE '2+' END AS bucket
        FROM characters ch
        LEFT JOIN story_characters sc ON sc.character_id = ch.id
        GROUP BY ch.id
      ) t
      GROUP BY bucket
      ORDER BY bucket`,
  },
  {
    title: "8. 分镜绑定的角色不在所属故事的角色列表中",
    query: Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE p.story_id IS NULL)  AS project_without_story,
        COUNT(*) FILTER (WHERE p.story_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM story_characters sc
          WHERE sc.story_id = p.story_id AND sc.character_id = pn.character_id
        ))                                          AS not_in_story_cast
      FROM panels pn
      JOIN projects p ON p.id = pn.project_id
      WHERE pn.character_id IS NOT NULL`,
  },
  {
    title: "9. 跨线软关联的悬空引用",
    query: Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM stories s
          WHERE s.source_novel_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM novel_projects n WHERE n.id = s.source_novel_id))
          AS story_missing_novel,
        (SELECT COUNT(*) FROM chapters c
          WHERE c.source_novel_chapter_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM novel_chapters nc WHERE nc.id = c.source_novel_chapter_id))
          AS chapter_missing_novel_chapter,
        (SELECT COUNT(*) FROM canvas_timelines t
          WHERE NOT EXISTS (SELECT 1 FROM novel_projects n WHERE n.id = t.novel_project_id))
          AS timeline_missing_novel,
        (SELECT COUNT(*) FROM timeline_chapters tc
          WHERE NOT EXISTS (SELECT 1 FROM novel_chapters nc WHERE nc.id = tc.chapter_id))
          AS timeline_chapter_missing_novel_chapter`,
  },
  {
    title: "10. 同一部小说被转换成多个 Story",
    query: Prisma.sql`
      SELECT COUNT(*) AS novels, COALESCE(SUM(cnt), 0) AS stories
      FROM (
        SELECT source_novel_id, COUNT(*) AS cnt
        FROM stories
        WHERE source_novel_id IS NOT NULL
        GROUP BY source_novel_id
        HAVING COUNT(*) > 1
      ) t`,
  },
];

// COUNT/SUM 在 PostgreSQL 中返回 bigint/numeric，统一转成 number 便于打印
function normalize(rows: Row[]): Row[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : value instanceof Prisma.Decimal ? value.toNumber() : value,
      ])
    )
  );
}

async function main(): Promise<void> {
  const results = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const collected: { title: string; rows: Row[] }[] = [];
      for (const { title, query } of queries) {
        const rows = await tx.$queryRaw<Row[]>(query);
        collected.push({ title, rows: normalize(rows) });
      }
      return collected;
    },
    { timeout: 120_000 }
  );

  for (const { title, rows } of results) {
    console.log(`\n${title}`);
    if (rows.length === 0) {
      console.log("  (无记录)");
    } else {
      console.table(rows);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error("审计失败:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
