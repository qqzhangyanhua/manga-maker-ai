/**
 * 脚本页面事件处理 Hook
 * 封装所有页面级别的事件处理逻辑
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useStoryOperation } from "./useStoryOperations";
import { useUpdateStory } from "./useStoryData";
import {
  useAddStoryCharacter,
  useRemoveStoryCharacter,
  useUpdateStoryCharacterRole,
} from "./useStoryCharacters";
import { useStreamingGeneration } from "./useStreamingGeneration";
import { formatErrorForToast } from "../utils/errorHandling";
import type { CharacterRole } from "@/components/StoryCharacter/types";

interface Story {
  title: string;
  premise?: string | null;
}

interface UseScriptPageHandlersProps {
  storyId: string;
  story: Story | null;
  projectId: string | null;
  storyForm: {
    title: string;
    premise: string;
    comic_style_id?: string | null;
    style_reference_image?: string | null;
  };
  setEditMode: (mode: boolean) => void;
  openGenerateDialog: (chapterId: string) => void;
  refetchPanels: () => Promise<unknown>;
}

export function useScriptPageHandlers({
  storyId,
  story,
  projectId,
  storyForm,
  setEditMode,
  openGenerateDialog,
  refetchPanels,
}: UseScriptPageHandlersProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { execute } = useStoryOperation();

  // Mutation hooks
  const updateStory = useUpdateStory(storyId);
  const addStoryCharacter = useAddStoryCharacter(storyId);
  const removeStoryCharacter = useRemoveStoryCharacter(storyId);
  const updateStoryCharacterRole = useUpdateStoryCharacterRole(storyId);

  // Streaming generation
  const { progress, isGenerating, generate, cancel, reset } = useStreamingGeneration();

  // 更新故事
  const handleUpdateStory = useCallback(async () => {
    await execute(
      async () => {
        await updateStory.mutateAsync(storyForm);
        setEditMode(false);
      },
      { successMessage: "剧本已保存" }
    );
  }, [execute, updateStory, storyForm, setEditMode]);

  // 图片生成成功
  const handleImageGenerated = useCallback(
    async (panelId: string, imageUrl: string) => {
      queryClient.setQueriesData(
        { queryKey: ["story-panels", storyId] },
        (old: { panels: Array<{ id: string; generated_image?: string }> } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            panels: old.panels.map((p) =>
              p.id === panelId ? { ...p, generated_image: imageUrl } : p
            ),
          };
        }
      );
      toast({ title: "图片生成成功" });
    },
    [queryClient, storyId, toast]
  );

  // 删除分镜
  const handleDeletePanel = useCallback(
    async (panelId: string): Promise<void> => {
      await execute(
        async () => {
          const response = await fetch(`/api/panel/${panelId}`, { method: "DELETE" });
          if (!response.ok) {
            const responseData = await response.json();
            throw new Error(responseData.error || "删除分镜失败");
          }
        },
        { successMessage: "分镜已删除" }
      );
    },
    [execute]
  );

  // 添加角色
  const handleAddCharacter = useCallback(
    async (characterId: string, role: CharacterRole): Promise<void> => {
      await execute(
        async () => {
          await addStoryCharacter.mutateAsync({ characterId, role });
        },
        { successMessage: "角色已添加到故事" }
      );
    },
    [execute, addStoryCharacter]
  );

  // 移除角色
  const handleRemoveCharacter = useCallback(
    async (characterId: string): Promise<void> => {
      await execute(
        async () => {
          await removeStoryCharacter.mutateAsync(characterId);
        },
        { successMessage: "角色已从故事移除" }
      );
    },
    [execute, removeStoryCharacter]
  );

  // 更新角色
  const handleCharacterRoleChange = useCallback(
    async (characterId: string, role: CharacterRole): Promise<void> => {
      await execute(
        async () => {
          await updateStoryCharacterRole.mutateAsync({ characterId, role });
        },
        { successMessage: "角色类型已更新" }
      );
    },
    [execute, updateStoryCharacterRole]
  );

  // 打开生成分镜对话框
  const handleGeneratePanelsForChapter = useCallback(
    async (chapterId: string): Promise<void> => {
      if (!story) {
        toast({ title: "故事不存在", variant: "destructive" });
        return;
      }
      openGenerateDialog(chapterId);
    },
    [story, toast, openGenerateDialog]
  );

  // 执行分镜生成
  const executeGeneration = useCallback(
    async (chapterId: string, mode: "overwrite" | "append", panelCount?: number): Promise<void> => {
      if (!story) {
        toast({ title: "故事不存在", variant: "destructive" });
        return;
      }
      try {
        let currentProjectId = projectId;

        // Create project if not exists
        if (!currentProjectId) {
          const createProjectRes = await fetch("/api/project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: story.title,
              description: story.premise || "AI生成的漫画项目",
              story_id: storyId,
            }),
          });

          if (!createProjectRes.ok) {
            const createError = await createProjectRes.json();
            throw new Error(createError.error || "创建项目失败");
          }
          const createProjectData = await createProjectRes.json();
          currentProjectId = createProjectData.project.id;
          await refetchPanels();
        }

        // Generate panels with streaming
        await generate({
          chapterId,
          projectId: currentProjectId as string,
          overwrite: mode === "overwrite",
          panelCount,
        });

        toast({
          title: "分镜生成完成",
          description:
            mode === "overwrite" ? "AI 已成功重新生成分镜脚本" : "AI 已成功追加新的分镜脚本",
        });
        reset();
      } catch (genError) {
        if (genError instanceof Error && genError.name !== "AbortError") {
          const errorInfo = formatErrorForToast(genError);
          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: "destructive",
          });
        }
      }
    },
    [story, projectId, storyId, generate, reset, toast, refetchPanels]
  );

  return {
    // 状态
    isSaving: updateStory.isPending,
    isGenerating,
    progress,

    // 生成操作
    cancelGeneration: cancel,

    // 事件处理
    handleUpdateStory,
    handleImageGenerated,
    handleDeletePanel,
    handleAddCharacter,
    handleRemoveCharacter,
    handleCharacterRoleChange,
    handleGeneratePanelsForChapter,
    executeGeneration,
  };
}
