import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { normalizeVersion, ApiVersion } from "./types";
import EditorPageClient from "./editor-page-client";

export const dynamic = "force-dynamic";

const INITIAL_PAGE = 1;
const INITIAL_PAGE_SIZE = 20;

async function getInitialEditorData() {
  const user = await getCurrentUser();
  if (!user?.userId) {
    return {
      versions: [],
      total: 0,
      page: INITIAL_PAGE,
      pageSize: INITIAL_PAGE_SIZE,
    };
  }

  const where = { user_id: user.userId };

  const [rawVersions, total] = await Promise.all([
    prisma.imagePageVersion.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (INITIAL_PAGE - 1) * INITIAL_PAGE_SIZE,
      take: INITIAL_PAGE_SIZE,
    }),
    prisma.imagePageVersion.count({ where }),
  ]);

  const versions = rawVersions.map((version) =>
    normalizeVersion({
      id: version.id,
      label: version.label,
      source_type: version.source_type as ApiVersion["source_type"],
      status: version.status,
      image_url: version.image_url,
      task_id: version.task_id,
      canvas_schema: (version.canvas_schema as Record<string, unknown> | null) ?? null,
      created_at: version.created_at.toISOString(),
      updated_at: version.updated_at.toISOString(),
      prompt: null,
    })
  );

  return {
    versions,
    total,
    page: INITIAL_PAGE,
    pageSize: INITIAL_PAGE_SIZE,
  };
}

export default async function EditorPage() {
  const initialData = await getInitialEditorData();

  return (
    <EditorPageClient
      initialVersions={initialData.versions}
      initialTotal={initialData.total}
      initialPage={initialData.page}
      initialPageSize={initialData.pageSize}
    />
  );
}
