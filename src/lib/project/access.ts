import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "@/lib/api-helpers";

type Db = PrismaClient | Prisma.TransactionClient;

/** 取当前用户的项目；不存在返回 404，属于他人返回 403 */
export async function getProjectForUser(db: Db, projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, user_id: true, story_id: true, title: true },
  });
  if (!project) {
    throw new ApiError("项目不存在", 404, "NOT_FOUND");
  }
  if (project.user_id !== userId) {
    throw new ApiError("无权访问此项目", 403, "FORBIDDEN");
  }
  return project;
}

/** 分镜挂到章节上时，章节必须属于同一个项目（不变量：panel.project_id == chapter.project_id） */
export async function assertChapterInProject(db: Db, chapterId: string, projectId: string) {
  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, project_id: true, story_id: true },
  });
  if (!chapter) {
    throw new ApiError("章节不存在", 404, "NOT_FOUND");
  }
  if (chapter.project_id !== projectId) {
    throw new ApiError("章节不属于该项目", 400, "CHAPTER_PROJECT_MISMATCH");
  }
  return chapter;
}

/** 分镜必须属于该项目 */
export async function assertPanelsInProject(db: Db, panelIds: string[], projectId: string) {
  const ids = Array.from(new Set(panelIds));
  if (ids.length === 0) return;
  const count = await db.panel.count({ where: { id: { in: ids }, project_id: projectId } });
  if (count !== ids.length) {
    throw new ApiError("分镜不属于该项目", 400, "PANEL_PROJECT_MISMATCH");
  }
}

export async function listProjectCharacters(db: Db, projectId: string) {
  return db.projectCharacter.findMany({
    where: { project_id: projectId },
    include: { character: true },
    orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
  });
}

/**
 * 分镜绑定的角色必须在项目角色中（ADR-0002）。角色本身必须来自当前用户的角色库；
 * 还不在项目角色里的，绑定时自动加入（role=minor），这样角色库里的角色可以直接拿来用。
 */
export async function ensureProjectCharacters(
  db: Db,
  params: { projectId: string; userId: string; characterIds: Array<string | null | undefined> }
): Promise<void> {
  const ids = Array.from(
    new Set(params.characterIds.filter((id): id is string => typeof id === "string" && id.length > 0))
  );
  if (ids.length === 0) return;

  const owned = await db.character.findMany({
    where: { id: { in: ids }, user_id: params.userId },
    select: { id: true },
  });
  if (owned.length !== ids.length) {
    throw new ApiError("角色不存在或不属于当前用户", 400, "INVALID_CHARACTER");
  }

  await db.projectCharacter.createMany({
    data: ids.map((characterId) => ({
      project_id: params.projectId,
      character_id: characterId,
      role: "minor",
    })),
    skipDuplicates: true,
  });
}

/**
 * LLM 产出的角色 ID 不可信：只返回其中属于当前用户角色库的 ID，调用方把其余的当作未绑定，
 * 不因为模型编造的 ID 让整个请求失败。
 */
export async function filterOwnedCharacterIds(
  db: Db,
  userId: string,
  characterIds: Array<string | null | undefined>
): Promise<Set<string>> {
  const ids = Array.from(
    new Set(characterIds.filter((id): id is string => typeof id === "string" && id.length > 0))
  );
  if (ids.length === 0) return new Set();

  const owned = await db.character.findMany({
    where: { id: { in: ids }, user_id: userId },
    select: { id: true },
  });
  return new Set(owned.map((c) => c.id));
}
