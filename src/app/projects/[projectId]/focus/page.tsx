import { redirect } from "next/navigation";
import { FocusModePage } from "@/app/scripts/[id]/focus/FocusModePage";
import { loadOwnedProject } from "@/lib/project/page";

export const dynamic = "force-dynamic";

export default async function ProjectFocusPage({ params }: { params: { projectId: string } }) {
  const project = await loadOwnedProject(params.projectId);

  if (!project.story_id) {
    redirect(`/projects/${project.id}/storyboard`);
  }

  return <FocusModePage storyId={project.story_id} routeProjectId={project.id} />;
}
