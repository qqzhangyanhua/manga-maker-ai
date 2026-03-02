import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { WorkflowResult } from "@/lib/type";
import { WorkflowPageClient } from "./workflow-page-client";
import type { WorkflowStatusItem } from "@/components/Workflow/WorkflowDashboard";

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function getInitialWorkflows(): Promise<WorkflowStatusItem[]> {
  const user = await getCurrentUser();
  if (!user?.userId) {
    return [];
  }

  const workflows = await prisma.workflow.findMany({
    where: { user_id: user.userId },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      current_step: true,
      progress: true,
      result: true,
      error: true,
      created_at: true,
      started_at: true,
      completed_at: true,
    },
  });

  return workflows.map((workflow) => ({
    id: workflow.id,
    status: workflow.status as WorkflowStatusItem["status"],
    currentStep: workflow.current_step,
    progress: workflow.progress,
    result: (workflow.result as WorkflowResult | null) ?? null,
    error: workflow.error ?? undefined,
    createdAt: toIso(workflow.created_at),
    startedAt: workflow.started_at ? toIso(workflow.started_at) : undefined,
    completedAt: workflow.completed_at ? toIso(workflow.completed_at) : undefined,
  }));
}

export default async function WorkflowPage() {
  const initialWorkflows = await getInitialWorkflows();
  return <WorkflowPageClient initialWorkflows={initialWorkflows} />;
}
