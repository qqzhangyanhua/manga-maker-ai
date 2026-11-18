import { redirect } from "next/navigation";
import { withSearch, type PageSearchParams } from "@/lib/project/page";

// 旧地址 /layout-editor/[projectId]，保留给已有链接和书签
export default function LegacyLayoutEditorPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: PageSearchParams;
}) {
  redirect(withSearch(`/projects/${params.projectId}/layout`, searchParams));
}
