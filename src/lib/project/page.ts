import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export type PageSearchParams = Record<string, string | string[] | undefined>;

const uuidSchema = z.string().uuid();

export async function requirePageUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.userId) {
    redirect("/auth/login");
  }
  return user.userId;
}

/** 页面用：取当前用户的项目，未登录跳登录页，不存在或无权访问跳回项目列表 */
export async function loadOwnedProject(projectId: string) {
  const userId = await requirePageUserId();
  if (!uuidSchema.safeParse(projectId).success) {
    redirect("/projects");
  }
  const project = await prisma.project.findFirst({
    where: { id: projectId, user_id: userId },
    select: { id: true, title: true, story_id: true },
  });
  if (!project) {
    redirect("/projects");
  }
  return project;
}

/** 重定向时保留原查询参数 */
export function withSearch(path: string, searchParams: PageSearchParams = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value !== undefined) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
