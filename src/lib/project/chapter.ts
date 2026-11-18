import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "@/lib/api-helpers";
import { assertChapterInProject } from "./access";

type Db = PrismaClient | Prisma.TransactionClient;

export const DEFAULT_CHAPTER_TITLE = "第一章";

function isClient(db: Db): db is PrismaClient {
  return "$transaction" in db;
}

async function findOrCreateDefaultChapter(tx: Prisma.TransactionClient, projectId: string): Promise<string> {
  // 与数据库触发器 project_root_fill_panel_chapter 使用同一个锁键，避免并发时建出两个"第一章"
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${projectId}))`;

  const first = await tx.chapter.findFirst({
    where: { project_id: projectId },
    orderBy: [{ chapter_order: "asc" }, { created_at: "asc" }],
    select: { id: true },
  });
  if (first) return first.id;

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { story_id: true },
  });
  if (!project) {
    throw new ApiError("项目不存在", 404, "NOT_FOUND");
  }

  const created = await tx.chapter.create({
    data: {
      project_id: projectId,
      // 兼容层：故事主项目的章节仍写 story_id，剧本编辑器按故事读章节
      story_id: project.story_id,
      title: DEFAULT_CHAPTER_TITLE,
      chapter_order: 1,
    },
    select: { id: true },
  });
  return created.id;
}

/** 项目的默认章节：按顺序取第一个章节，没有章节时建"第一章"。分镜必须挂在章节上。 */
export async function ensureDefaultChapter(db: Db, projectId: string): Promise<string> {
  if (isClient(db)) {
    return db.$transaction((tx) => findOrCreateDefaultChapter(tx, projectId));
  }
  return findOrCreateDefaultChapter(db, projectId);
}

/** 新分镜的章节：请求指定了章节就校验它属于该项目，否则用项目默认章节 */
export async function resolvePanelChapter(
  db: Db,
  projectId: string,
  chapterId: string | null | undefined
): Promise<string> {
  if (chapterId) {
    await assertChapterInProject(db, chapterId, projectId);
    return chapterId;
  }
  return ensureDefaultChapter(db, projectId);
}
