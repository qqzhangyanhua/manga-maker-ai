import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Project, Panel, OperationLoadingState } from "@/types/storyboard";

type UseStoryboardDataReturn = {
  project: Project | null;
  loading: boolean;
  operationLoading: OperationLoadingState;
  handlePanelUpdate: (panelId: string, updates: Partial<Panel>) => Promise<void>;
  handleMerge: (panelId: string) => Promise<void>;
  handleSplit: (panelId: string) => Promise<void>;
  handleInsertPanel: (description: string, useLLM: boolean, insertAfterOrder: number | null) => Promise<void>;
  handleGenerateSketch: (panelId: string) => Promise<void>;
};

/**
 * Storyboard 数据管理 Hook
 * 处理项目加载、分镜更新、合并、拆分、插入等操作
 */
export function useStoryboardData(projectId: string): UseStoryboardDataReturn {
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<OperationLoadingState>({
    type: null,
  });

  // 加载项目数据
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/project/${projectId}`);
        if (!response.ok) {
          throw new Error("加载项目失败");
        }
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error("Fetch project error:", error);
        toast({
          title: "加载失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        router.push("/storyboard");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, router, toast]);

  // 更新分镜
  const handlePanelUpdate = useCallback(
    async (panelId: string, updates: Partial<Panel>) => {
      try {
        const response = await fetch(`/api/panel/${panelId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("更新失败");
        }

        const { panel: updatedPanel } = await response.json();

        // 更新本地状态
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            panels: prev.panels.map((p) =>
              p.id === panelId ? { ...p, ...updatedPanel } : p
            ),
          };
        });

        toast({
          title: "已保存",
          description: "分镜已更新",
        });
      } catch (error) {
        console.error("Update panel error:", error);
        toast({
          title: "保存失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // 合并分镜
  const handleMerge = useCallback(
    async (panelId: string) => {
      if (!project) return;

      const panelIndex = project.panels.findIndex((p) => p.id === panelId);
      if (panelIndex === -1 || panelIndex === project.panels.length - 1) {
        toast({
          title: "无法合并",
          description: "只能合并相邻的分镜，且不能是最后一个分镜",
          variant: "destructive",
        });
        return;
      }

      const nextPanel = project.panels[panelIndex + 1];

      setOperationLoading({ type: "merge", panelId });
      try {
        const response = await fetch("/api/panel/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_ids: [panelId, nextPanel.id],
            project_id: project.id,
          }),
        });

        if (!response.ok) {
          throw new Error("合并失败");
        }

        // 重新加载项目
        const projectResponse = await fetch(`/api/project/${project.id}`);
        const data = await projectResponse.json();
        setProject(data);

        toast({
          title: "合并成功",
          description: "两个分镜已合并为一个",
        });
      } catch (error) {
        console.error("Merge error:", error);
        toast({
          title: "合并失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setOperationLoading({ type: null });
      }
    },
    [project, toast]
  );

  // 拆分分镜
  const handleSplit = useCallback(
    async (panelId: string) => {
      setOperationLoading({ type: "split", panelId });
      try {
        const response = await fetch("/api/panel/split", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_id: panelId,
            split_hint: "根据内容自然拆分为两个连贯的画面",
          }),
        });

        if (!response.ok) {
          throw new Error("拆分失败");
        }

        // 重新加载项目
        if (project) {
          const projectResponse = await fetch(`/api/project/${project.id}`);
          const data = await projectResponse.json();
          setProject(data);
        }

        toast({
          title: "拆分成功",
          description: "分镜已拆分为两个",
        });
      } catch (error) {
        console.error("Split error:", error);
        toast({
          title: "拆分失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setOperationLoading({ type: null });
      }
    },
    [project, toast]
  );

  // 执行插入分镜
  const handleInsertPanel = useCallback(
    async (description: string, useLLM: boolean, insertAfterOrder: number | null) => {
      if (!project || insertAfterOrder === null) return;

      setOperationLoading({ type: "insert" });
      try {
        const response = await fetch("/api/panel/insert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project.id,
            insert_after_order: insertAfterOrder,
            description,
            use_llm: useLLM,
          }),
        });

        if (!response.ok) {
          throw new Error("插入失败");
        }

        // 重新加载项目
        const projectResponse = await fetch(`/api/project/${project.id}`);
        const data = await projectResponse.json();
        setProject(data);

        toast({
          title: "插入成功",
          description: "新分镜已插入",
        });
      } catch (error) {
        console.error("Insert error:", error);
        toast({
          title: "插入失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setOperationLoading({ type: null });
      }
    },
    [project, toast]
  );

  // 生成草图（占位符）
  const handleGenerateSketch = useCallback(
    async (panelId: string) => {
      toast({
        title: "功能开发中",
        description: "草图生成功能将在后续版本中实现",
      });
    },
    [toast]
  );

  return {
    project,
    loading,
    operationLoading,
    handlePanelUpdate,
    handleMerge,
    handleSplit,
    handleInsertPanel,
    handleGenerateSketch,
  };
}
