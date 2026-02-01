/**
 * 选中分镜的简要信息面板
 */

"use client";

import { Badge } from "@/components/ui/badge";
import type { Panel } from "../../types/script-editor.types";

interface StoryboardPanelInfoProps {
  panel: Panel;
}

export function StoryboardPanelInfo({ panel }: StoryboardPanelInfoProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#1a1a1f]/95 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 shadow-xl max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">#{panel.panel_order}</Badge>
          {panel.shot_size && <Badge variant="outline">{panel.shot_size}</Badge>}
          {panel.camera_angle && <Badge variant="outline">{panel.camera_angle}</Badge>}
        </div>
        <p className="text-sm text-gray-300 line-clamp-2">
          {panel.description || (panel as Panel & { visual_description?: string }).visual_description || "无描述"}
        </p>
        {panel.dialogue && (
          <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">
            {panel.dialogue}
          </p>
        )}
      </div>
    </div>
  );
}
