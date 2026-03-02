import { prisma } from "@/lib/db";
import type { TemplateWithMeta } from "@/types/template";
import StoryboardPageClient from "./storyboard-page-client";

export const dynamic = "force-dynamic";

function parseTemplateData(templateData: unknown): Record<string, unknown> {
  if (templateData && typeof templateData === "object" && !Array.isArray(templateData)) {
    return templateData as Record<string, unknown>;
  }

  if (typeof templateData === "string") {
    try {
      const parsed = JSON.parse(templateData) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

async function getInitialPanelTemplates(): Promise<TemplateWithMeta[]> {
  const templates = await prisma.panelTemplate.findMany({
    where: { is_official: true },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      user_id: true,
      name: true,
      description: true,
      panel_count: true,
      template_data: true,
      tags: true,
      is_public: true,
      is_official: true,
      likes_count: true,
      usage_count: true,
      thumbnail_url: true,
      created_at: true,
      updated_at: true,
    },
  });

  return templates.map((template) => ({
    ...template,
    template_data: parseTemplateData(template.template_data),
    created_at: template.created_at.toISOString(),
    updated_at: template.updated_at.toISOString(),
  })) as unknown as TemplateWithMeta[];
}

export default async function StoryboardPage() {
  const initialPanelTemplates = await getInitialPanelTemplates();
  return <StoryboardPageClient initialPanelTemplates={initialPanelTemplates} />;
}
