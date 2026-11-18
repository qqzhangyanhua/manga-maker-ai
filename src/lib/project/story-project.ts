import type { Prisma, PrismaClient, Project } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 故事的主项目：projects.story_id 指向该故事的唯一项目（数据库唯一索引 unique_projects_story 保证）。
 * 阶段 2 的数据库触发器会在新建故事时自动创建主项目（ADR-0004），这里的创建分支只在触发器
 * 尚未部署的库上生效，保证代码先于迁移上线时行为不变。
 */
export async function findStoryProject(db: Db, storyId: string): Promise<Project | null> {
  return db.project.findFirst({
    where: { story_id: storyId },
    orderBy: { updated_at: "desc" },
  });
}

export async function ensureStoryProject(db: Db, storyId: string): Promise<Project> {
  const existing = await findStoryProject(db, storyId);
  if (existing) {
    return existing;
  }

  const story = await db.story.findUnique({
    where: { id: storyId },
    select: {
      user_id: true,
      title: true,
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
  if (!story) {
    throw new Error(`故事不存在：${storyId}`);
  }

  const { user_id, outline, ...settings } = story;
  return db.project.create({
    data: {
      ...settings,
      user_id,
      story_id: storyId,
      outline: outline as Prisma.InputJsonValue,
      status: "draft",
    },
  });
}
