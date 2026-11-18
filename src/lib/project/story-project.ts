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

/**
 * 删除项目；若是故事的主项目，连同故事一起删除。章节、分镜随项目级联删除，故事角色随故事级联删除。
 */
export async function deleteProjectWithStory(db: PrismaClient, projectId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { story_id: true },
    });
    if (!project) return;
    if (project.story_id) {
      await tx.story.delete({ where: { id: project.story_id } });
    }
    await tx.project.delete({ where: { id: projectId } });
  });
}

/** 删除故事及其主项目（项目是作品根，故事删除后主项目不再单独保留） */
export async function deleteStoryWithProject(db: PrismaClient, storyId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const project = await findStoryProject(tx, storyId);
    await tx.story.delete({ where: { id: storyId } });
    if (project) {
      await tx.project.delete({ where: { id: project.id } });
    }
  });
}
