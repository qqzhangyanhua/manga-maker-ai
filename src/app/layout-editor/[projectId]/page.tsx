import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LayoutEditorPage } from "./LayoutEditorPage";
import type { ComicPageData } from "@/types/layout";

export const metadata: Metadata = {
  title: "排版编辑器 - Manga Maker AI",
  description: "漫画排版与导出编辑器",
};

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { projectId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/auth/login");
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    redirect("/auth/login");
  }

  // 获取项目信息
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      user_id: payload.userId,
    },
    include: {
      comicPages: {
        orderBy: { page_order: "asc" },
      },
    },
  });

  if (!project) {
    redirect("/projects");
  }

  // 转换页面数据
  const pages: ComicPageData[] = project.comicPages.map((page) => ({
    id: page.id,
    projectId: page.project_id,
    pageOrder: page.page_order,
    width: page.width,
    height: page.height,
    dpi: page.dpi,
    presetName: page.preset_name || undefined,
    canvasData: page.canvas_data as unknown as ComicPageData["canvasData"],
    thumbnailUrl: page.thumbnail_url || undefined,
    templateId: page.template_id || undefined,
    createdAt: page.created_at.toISOString(),
    updatedAt: page.updated_at.toISOString(),
  }));

  return (
    <LayoutEditorPage
      projectId={projectId}
      projectName={project.title}
      initialPages={pages}
    />
  );
}
