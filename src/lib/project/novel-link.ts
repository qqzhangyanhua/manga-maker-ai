import { prisma } from "@/lib/db";

type DbClient = Pick<typeof prisma, "project">;

export interface NovelComicProject {
  id: string;
  title: string;
}

/**
 * 列出一部小说改编出的漫画项目（同一用户下 source_novel_id 匹配）。
 * 用于画布时间线归属：恰好一个时可自动关联，多个时需要用户选择。
 */
export async function listNovelComicProjects(
  db: DbClient,
  userId: string,
  novelProjectId: string
): Promise<NovelComicProject[]> {
  return db.project.findMany({
    where: { user_id: userId, source_novel_id: novelProjectId },
    select: { id: true, title: true },
    orderBy: { updated_at: "desc" },
  });
}

/**
 * 小说改编项目恰好只有一个时返回它，否则返回 null（零个或多个都不自动关联）。
 */
export async function findUnambiguousNovelProject(
  db: DbClient,
  userId: string,
  novelProjectId: string
): Promise<NovelComicProject | null> {
  const projects = await listNovelComicProjects(db, userId, novelProjectId);
  return projects.length === 1 ? projects[0] : null;
}
