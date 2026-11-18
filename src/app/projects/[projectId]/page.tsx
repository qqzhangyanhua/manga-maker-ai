import { redirect } from "next/navigation";
import { ScriptEditorPage } from "@/app/scripts/[id]/ScriptEditorPage";
import { loadOwnedProject } from "@/lib/project/page";

export const dynamic = "force-dynamic";

export default async function ProjectHomePage({ params }: { params: { projectId: string } }) {
  const project = await loadOwnedProject(params.projectId);

  // 没有故事的独立项目还没有章节（阶段 4 补齐），直接进入分镜编辑器
  if (!project.story_id) {
    redirect(`/projects/${project.id}/storyboard`);
  }

  return <ScriptEditorPage storyId={project.story_id} routeProjectId={project.id} />;
}
