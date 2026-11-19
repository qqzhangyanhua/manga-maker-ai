import type { Prisma, PrismaClient, Project } from "@prisma/client";
import { ensureStoryProject } from "./story-project";

type Db = PrismaClient | Prisma.TransactionClient;

export interface NovelSource {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
}

export function mapNovelGenreToStoryGenre(novelGenre: string | null): string {
  const genreMap: Record<string, string> = {
    suspense: "suspense",
    romance: "romance",
    adventure: "adventure",
    scifi: "scifi",
    fantasy: "fantasy",
    other: "daily",
  };
  return genreMap[novelGenre || "other"] || "daily";
}

/**
 * 取小说的改编项目，没有就新建。与小说转漫画走同一条路径：先找或建来源为该小说的故事，
 * 再取故事主项目（数据库触发器会在新建故事时建主项目并带上 source_novel_id）。
 * 这样以后再对同一部小说执行小说转漫画时，会追加到这个项目而不是另建一个。
 */
export async function ensureNovelAdaptationProject(
  db: Db,
  userId: string,
  novel: NovelSource
): Promise<Project> {
  const existingStory = await db.story.findFirst({
    where: { user_id: userId, source_novel_id: novel.id },
    orderBy: { created_at: "asc" },
    select: { id: true },
  });

  const storyId =
    existingStory?.id ??
    (
      await db.story.create({
        data: {
          user_id: userId,
          title: `${novel.title}（漫画改编）`,
          premise: novel.description || `改编自小说《${novel.title}》`,
          genre: mapNovelGenreToStoryGenre(novel.genre),
          outline: { acts: [], scenes: [] },
          source_type: "novel_adaptation",
          source_novel_id: novel.id,
          status: "draft",
        },
        select: { id: true },
      })
    ).id;

  const project = await ensureStoryProject(db, storyId);
  if (project.source_novel_id === novel.id) return project;

  return db.project.update({
    where: { id: project.id },
    data: { source_type: "novel_adaptation", source_novel_id: novel.id },
  });
}
