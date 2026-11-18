import { redirect } from "next/navigation";
import { resolveStoryProjectId } from "@/lib/project/legacy-route";
import { withSearch, type PageSearchParams } from "@/lib/project/page";

export const dynamic = "force-dynamic";

// 旧地址 /scripts/[storyId]，保留给已有链接和书签
export default async function LegacyScriptPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: PageSearchParams;
}) {
  const projectId = await resolveStoryProjectId(params.id);
  redirect(withSearch(`/projects/${projectId}`, searchParams));
}
