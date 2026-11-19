"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, FolderPlus, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useUpdateTimelineConfig } from "@/hooks/useTimelineConfig";
import { novelTheme } from "../../../theme";
import type { CandidateProject } from "../../../components/InfiniteCanvas/types";

interface ProjectLinkBannerProps {
  timelineId: string;
  candidates: CandidateProject[];
}

interface CreateProjectResponse {
  success: boolean;
  project: CandidateProject;
  chapters_created: number;
}

// 画布用到的几处角色列表查询，归属项目后角色来源会变
const CHARACTER_QUERY_PREFIXES = ["novel-characters", "timeline-novel-characters", "novelCharacters"];

/**
 * 画布时间线尚未归属漫画项目时显示：有候选项目就让用户选择，没有就提供新建入口
 */
export function ProjectLinkBanner({ timelineId, candidates }: ProjectLinkBannerProps) {
  const queryClient = useQueryClient();
  const updateConfig = useUpdateTimelineConfig(timelineId);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refreshCharacters = () => {
    for (const prefix of CHARACTER_QUERY_PREFIXES) {
      queryClient.invalidateQueries({ queryKey: [prefix, timelineId] });
    }
  };

  const createProject = useMutation({
    mutationFn: async (): Promise<CreateProjectResponse> => {
      const res = await fetch(`/api/canvas/timeline/${timelineId}/project`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "创建漫画项目失败");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(`已创建漫画项目「${data.project.title}」并关联到画布`);
      refreshCharacters();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "创建漫画项目失败");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", timelineId] });
      queryClient.invalidateQueries({ queryKey: ["timeline-config", timelineId] });
    },
  });

  const handleLink = (project: CandidateProject) => {
    setPendingId(project.id);
    updateConfig.mutate(
      { project_id: project.id },
      {
        onSuccess: () => {
          toast.success(`已关联到漫画项目「${project.title}」`);
          refreshCharacters();
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "关联项目失败");
        },
        onSettled: () => setPendingId(null),
      }
    );
  };

  if (candidates.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-amber-500/20 bg-amber-500/5">
        <FolderKanban className="w-4 h-4 text-amber-300 shrink-0" />
        <p className="text-sm text-amber-100/90">
          该画布还没有归属漫画项目，这部小说也还没有改编成漫画项目。创建后，画布章节会同步为项目章节：
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={createProject.isPending}
          onClick={() => createProject.mutate()}
          className={novelTheme.button.outline}
        >
          {createProject.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
          )}
          创建漫画项目
        </Button>
      </div>
    );
  }

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
