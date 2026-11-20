import { NextResponse } from "next/server";

import type { ChapterSegmentRecord } from "@/lib/script-segment";

interface JsonExportPanel {
  id: string;
  panel_order: number;
  description: string;
  dialogue: string | null;
  panel_type: string;
  importance: string;
  camera_angle: string | null;
  shot_size: string | null;
  prompt_used: string | null;
  visual_prompt: string | null;
  generated_image: string | null;
  expression_type: string | null;
  character: { id: string; name: string } | null;
  outfit: { id: string; outfit_type: string } | null;
  scene: { id: string; name: string } | null;
}

interface JsonExportProject {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  status: string;
  cover_image: string | null;
  created_at: Date;
  updated_at: Date;
  Story: { id: string; title: string } | null;
  script: { content: string } | null;
  panels: JsonExportPanel[];
}

/** 导出项目 JSON。剧本片段读章节上的行，不读项目级 JSON。 */
export function exportProjectJson(project: JsonExportProject, segments: ChapterSegmentRecord[]) {
  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      style: project.style,
      status: project.status,
      coverImage: project.cover_image,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    story: project.Story
      ? {
          id: project.Story.id,
          title: project.Story.title,
        }
      : null,
    script: project.script || segments.length > 0
      ? {
          originalText: project.script?.content ?? "",
          segmentedData: segments.map((segment) => ({
            id: segment.id,
            text: segment.content,
            start: segment.source_text_start,
            end: segment.source_text_end,
          })),
        }
      : null,
    panels: project.panels.map((panel) => ({
      id: panel.id,
      order: panel.panel_order,
      description: panel.description,
      dialogue: panel.dialogue,
      panelType: panel.panel_type,
      importance: panel.importance,
      cameraAngle: panel.camera_angle,
      shotSize: panel.shot_size,
      promptUsed: panel.prompt_used,
      visualPrompt: panel.visual_prompt,
      generatedImage: panel.generated_image,
      character: panel.character
        ? {
            id: panel.character.id,
            name: panel.character.name,
          }
        : null,
      expressionType: panel.expression_type,
      outfit: panel.outfit
        ? {
            id: panel.outfit.id,
            type: panel.outfit.outfit_type,
          }
        : null,
      scene: panel.scene
        ? {
            id: panel.scene.id,
            name: panel.scene.name,
          }
        : null,
    })),
  };

  const filename = `${sanitizeFilename(project.title || "storyboard")}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");
}
