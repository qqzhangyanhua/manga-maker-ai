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
import { Loader2, Info, BookOpen, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PanelTemplate } from "@/types/template";

interface Story {
  id: string;
  title: string;
  genre: string;
  premise?: string | null;
}

interface ApplyTemplateWithProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PanelTemplate | null;
  onApply: (data: ApplyTemplateData) => Promise<void>;
}

export interface ApplyTemplateData {
  templateId: string;
  storyId: string | null;
  mode: "insert" | "replace";
  insertAfterOrder?: number;
  targetPanelIds?: string[];
  newStoryTitle?: string;
}

export function ApplyTemplateWithProjectDialog({
  open,
  onOpenChange,
  template,
  onApply
}: ApplyTemplateWithProjectDialogProps) {
  const [selectionMode, setSelectionMode] = useState<"existing" | "new">("existing");
  const [storyId, setStoryId] = useState<string>("");
  const [newStoryTitle, setNewStoryTitle] = useState<string>("");
  const [mode] = useState<"insert">("insert"); // Only insert mode for template marketplace
  const [insertAfterOrder, setInsertAfterOrder] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's stories
  const { data: storiesData, isLoading: isLoadingStories } = useQuery<{ stories: Story[] }>({
    queryKey: ["stories-for-template"],
    queryFn: async () => {
      const response = await fetch("/api/story");
      if (!response.ok) {
        throw new Error("Failed to fetch stories");
      }
      return await response.json();
    },
    enabled: open
  });

  const stories = storiesData?.stories || [];

  // Fetch story's panel count when selected (via project)
  const { data: storyPanelData } = useQuery<{ panelCount: number }>({
    queryKey: ["story-panels", storyId],
    queryFn: async () => {
      if (!storyId) return { panelCount: 0 };

      // 查找关联的项目
      const response = await fetch(`/api/project?story_id=${storyId}`);
      if (!response.ok) return { panelCount: 0 };

      const data = await response.json();
      const projects = data.data || [];

      if (projects.length === 0) return { panelCount: 0 };

      // 获取第一个项目的分镜数
      const projectId = projects[0].id;
      const projectResponse = await fetch(`/api/project/${projectId}`);
      if (!projectResponse.ok) return { panelCount: 0 };

      const projectData = await projectResponse.json();
      return { panelCount: projectData.data?.panels?.length || 0 };
    },
    enabled: !!storyId && selectionMode === "existing"
  });

  const maxPanelOrder = storyPanelData?.panelCount || 0;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectionMode("existing");
      setStoryId("");
      setNewStoryTitle("");
      setInsertAfterOrder("");
    }
  }, [open]);

  const handleApply = async () => {
    if (!template) return;

    // Validate
    if (selectionMode === "existing" && !storyId) return;
    if (selectionMode === "new" && !newStoryTitle.trim()) return;

    const orderValue = insertAfterOrder.trim();
    const order = orderValue === "" ? -1 : parseInt(orderValue, 10);

    if (selectionMode === "existing" && orderValue !== "" && (isNaN(order) || order < 0 || order > maxPanelOrder)) {
      return;
    }

    setIsLoading(true);
    try {
      const data: ApplyTemplateData = {
        templateId: template.id,
        storyId: selectionMode === "existing" ? storyId : null,
        mode,
        newStoryTitle: selectionMode === "new" ? newStoryTitle.trim() : undefined
      };

      if (order !== undefined && selectionMode === "existing") {
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

  const canApply = selectionMode === "existing"
    ? storyId && isValidInsertOrder
    : newStoryTitle.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>应用模板</DialogTitle>
          <DialogDescription>
            将「{template.name}」({template.panel_count} 个分镜) 应用到剧本中
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selection mode */}
          <RadioGroup value={selectionMode} onValueChange={(value) => setSelectionMode(value as "existing" | "new")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
                <BookOpen className="h-4 w-4" />
                选择已有剧本
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                创建新剧本（快速开始）
              </Label>
            </div>
          </RadioGroup>

          {/* Existing story selection */}
          {selectionMode === "existing" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="story">选择剧本</Label>
                <Select value={storyId} onValueChange={setStoryId} disabled={isLoadingStories}>
                  <SelectTrigger id="story">
                    <SelectValue placeholder={isLoadingStories ? "加载中..." : "请选择剧本"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stories && stories.length > 0 ? (
                      stories.map((story) => (
                        <SelectItem key={story.id} value={story.id}>
                          {story.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-stories" disabled>
                        暂无剧本，请选择"创建新剧本"
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {stories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    您还没有创建剧本。建议选择"创建新剧本"快速开始。
                  </p>
                )}
              </div>

              {/* Insert position - only show when story is selected */}
              {storyId && (
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
                      placeholder={maxPanelOrder === 0 ? "0 (剧本为空)" : `0-${maxPanelOrder} (当前最大 ${maxPanelOrder})`}
                      value={insertAfterOrder}
                      onChange={(e) => setInsertAfterOrder(e.target.value)}
                    />
                    {insertAfterOrder && !isValidInsertOrder && (
                      <p className="text-sm text-destructive">
                        请输入 0-{maxPanelOrder} 之间的数字
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      当前剧本有 {maxPanelOrder} 个分镜
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
            </>
          )}

          {/* New story creation */}
          {selectionMode === "new" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newStoryTitle">剧本标题</Label>
                <Input
                  id="newStoryTitle"
                  placeholder="例如：我的第一个漫画故事"
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  将创建新剧本并插入 {template.panel_count} 个分镜。您可以稍后填充剧本内容和角色。
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
