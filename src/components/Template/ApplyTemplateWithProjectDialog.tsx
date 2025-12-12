"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Info, FolderOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PanelTemplate } from "@/types/template";

interface Project {
  id: string;
  title: string;
  description?: string | null;
  panel_count?: number;
}

interface ApplyTemplateWithProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PanelTemplate | null;
  onApply: (data: ApplyTemplateData) => Promise<void>;
}

export interface ApplyTemplateData {
  templateId: string;
  projectId: string;
  mode: "insert" | "replace";
  insertAfterOrder?: number;
  targetPanelIds?: string[];
}

export function ApplyTemplateWithProjectDialog({
  open,
  onOpenChange,
  template,
  onApply
}: ApplyTemplateWithProjectDialogProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [mode, setMode] = useState<"insert">("insert"); // Only insert mode for template marketplace
  const [insertAfterOrder, setInsertAfterOrder] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's projects
  const { data: projects, isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ["projects-for-template"],
    queryFn: async () => {
      const response = await fetch("/api/project");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();
      return data.data || [];
    },
    enabled: open
  });

  // Fetch project details when selected
  const { data: projectDetails } = useQuery<{ panels: unknown[] }>({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      if (!projectId) return { panels: [] };
      const response = await fetch(`/api/project/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch project details");
      }
      const data = await response.json();
      return data.data || { panels: [] };
    },
    enabled: !!projectId
  });

  const maxPanelOrder = projectDetails?.panels?.length || 0;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setProjectId("");
      setMode("insert");
      setInsertAfterOrder("");
    }
  }, [open]);

  const handleApply = async () => {
    if (!template || !projectId) return;

    const orderValue = insertAfterOrder.trim();
    const order = orderValue === "" ? -1 : parseInt(orderValue, 10);

    if (orderValue !== "" && (isNaN(order) || order < 0 || order > maxPanelOrder)) {
      return;
    }

    setIsLoading(true);
    try {
      const data: ApplyTemplateData = {
        templateId: template.id,
        projectId,
        mode
      };

      if (order !== undefined) {
        data.insertAfterOrder = order;
      }

      await onApply(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to apply template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!template) return null;

  const insertOrderNumber = insertAfterOrder.trim() === ""
    ? maxPanelOrder
    : parseInt(insertAfterOrder, 10);
  const isValidInsertOrder = insertAfterOrder.trim() === "" ||
    (!isNaN(insertOrderNumber) && insertOrderNumber >= 0 && insertOrderNumber <= maxPanelOrder);

  const canApply = projectId && isValidInsertOrder;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>应用模板</DialogTitle>
          <DialogDescription>
            将「{template.name}」({template.panel_count} 个分镜) 应用到项目中
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project selection */}
          <div className="space-y-2">
            <Label htmlFor="project" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              选择项目
            </Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isLoadingProjects}>
              <SelectTrigger id="project">
                <SelectValue placeholder={isLoadingProjects ? "加载中..." : "请选择要应用模板的项目"} />
              </SelectTrigger>
              <SelectContent>
                {projects && projects.length > 0 ? (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title} {project.description && `- ${project.description}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-projects" disabled>
                    暂无可用项目，请先创建项目
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {projects && projects.length === 0 && (
              <p className="text-sm text-muted-foreground">
                您还没有创建任何项目。请先创建项目后再应用模板。
              </p>
            )}
          </div>

          {/* Insert position - only show when project is selected */}
          {projectId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm">
                  插入位置 (留空则插入到末尾)
                </Label>
                <Input
                  id="position"
                  type="number"
                  min={0}
                  max={maxPanelOrder}
                  placeholder={maxPanelOrder === 0 ? "0 (项目为空)" : `0-${maxPanelOrder} (当前最大 ${maxPanelOrder})`}
                  value={insertAfterOrder}
                  onChange={(e) => setInsertAfterOrder(e.target.value)}
                />
                {insertAfterOrder && !isValidInsertOrder && (
                  <p className="text-sm text-destructive">
                    请输入 0-{maxPanelOrder} 之间的数字
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  当前项目有 {maxPanelOrder} 个分镜
                </p>
              </div>

              {/* Info alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  将在位置 {insertOrderNumber} 之后插入 {template.panel_count} 个分镜
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleApply}
            disabled={isLoading || !canApply}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                应用中...
              </>
            ) : (
              "应用模板"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
