import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureStoryProject } from "./story-project";
import { requirePageUserId } from "./page";

/** 旧的按故事寻址的 URL 换成故事主项目的 ID */
export async function resolveStoryProjectId(storyId: string): Promise<string> {
  const userId = await requirePageUserId();
  if (!z.string().uuid().safeParse(storyId).success) {
    redirect("/projects");
  }
  const story = await prisma.story.findFirst({
    where: { id: storyId, user_id: userId },
    select: { id: true },
  });
  if (!story) {
    redirect("/projects");
  }
  const project = await ensureStoryProject(prisma, story.id);
  return project.id;
}
