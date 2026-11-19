"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUpdateTimelineConfig } from "@/hooks/useTimelineConfig";
import { novelTheme } from "../../../theme";
import type { CandidateProject } from "../../../components/InfiniteCanvas/types";

interface ProjectLinkBannerProps {
  timelineId: string;
  candidates: CandidateProject[];
}

/**
 * 画布时间线尚未归属漫画项目、且同一小说对应多个项目时，让用户选择归属
 */
export function ProjectLinkBanner({ timelineId, candidates }: ProjectLinkBannerProps) {
  const queryClient = useQueryClient();
  const updateConfig = useUpdateTimelineConfig(timelineId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleLink = (project: CandidateProject) => {
    setPendingId(project.id);
    updateConfig.mutate(
      { project_id: project.id },
      {
        onSuccess: () => {
          toast.success(`已关联到漫画项目「${project.title}」`);
          // 归属后角色来源切换为项目角色
          queryClient.invalidateQueries({ queryKey: ["novel-characters", timelineId] });
          queryClient.invalidateQueries({ queryKey: ["timeline-novel-characters", timelineId] });
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "关联项目失败");
        },
        onSettled: () => setPendingId(null),
      }
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-amber-500/20 bg-amber-500/5">
      <FolderKanban className="w-4 h-4 text-amber-300 shrink-0" />
      <p className="text-sm text-amber-100/90">
        该画布还没有归属漫画项目。这部小说对应多个项目，请选择画布属于哪个项目：
      </p>
      <div className="flex flex-wrap gap-2">
        {candidates.map((project) => (
          <Button
            key={project.id}
            variant="outline"
            size="sm"
            disabled={updateConfig.isPending}
            onClick={() => handleLink(project)}
            className={novelTheme.button.outline}
          >
            {pendingId === project.id ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            {project.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
