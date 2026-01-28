"use client";

/**
 * 分镜角色绑定面板
 * 
 * 用于为分镜选择和绑定角色身份证 Prompt
 */

import { useState, useCallback, useMemo, type JSX } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  Eye,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import type { CharacterPromptTemplate } from "@/types/character-prompt";

// 角色位置选项
const POSITION_OPTIONS = [
  { value: "left", label: "左侧" },
  { value: "center", label: "中央" },
  { value: "right", label: "右侧" },
  { value: "foreground", label: "前景" },
  { value: "background", label: "背景" },
];

// 角色信息（从角色库获取，带完整的 Prompt 模板）
interface CharacterWithPromptsFull {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  prompts: CharacterPromptTemplate[];
}

interface ShotCharacterBindingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shotId: string;
  shotDescription: string;
  novelProjectId: string;
  existingBindings?: {
    templateId: string;
    position?: string;
  }[];
  onSuccess?: () => void;
}

export function ShotCharacterBindingPanel({
  open,
  onOpenChange,
  shotId,
  shotDescription,
  novelProjectId,
  existingBindings = [],
  onSuccess,
}: ShotCharacterBindingPanelProps) {
  const queryClient = useQueryClient();

  // 选中的模板和位置
  const [selectedTemplates, setSelectedTemplates] = useState<Map<string, string | undefined>>(
    () => {
      const map = new Map<string, string | undefined>();
      existingBindings.forEach((b) => {
        map.set(b.templateId, b.position);
      });
      return map;
    }
  );

  // 手动调整文本
  const [manualAdjustments, setManualAdjustments] = useState("");

  // 展开的角色 ID
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());

  // 获取项目角色和他们的 Prompt
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ["novel-project-characters", novelProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/novel/projects/${novelProjectId}`);
      if (!res.ok) throw new Error("获取项目信息失败");
      return res.json();
    },
    enabled: open && !!novelProjectId,
  });

  // 获取所有角色的 Prompt 模板
  const characters: { id: string; name: string; description?: string; image_url?: string }[] =
    projectData?.project?.characters || [];

  // 为每个角色获取 Prompt 模板
  const { data: characterPromptsData } = useQuery({
    queryKey: ["all-character-prompts", characters.map((c) => c.id)],
    queryFn: async () => {
      const results = await Promise.all(
        characters.map(async (character) => {
          const res = await fetch(`/api/canvas/character/${character.id}/prompts`);
          if (!res.ok) return { ...character, prompts: [] };
          const data = await res.json();
          return { ...character, prompts: data.prompts || [] };
        })
      );
      return results;
    },
    enabled: open && characters.length > 0,
  });

  const charactersWithPrompts = useMemo<CharacterWithPrompts[]>(
    () => characterPromptsData || [],
    [characterPromptsData]
  );

  // 合成 Prompt
  const composeMutation = useMutation({
    mutationFn: async () => {
      // 构建请求数据
      const templateIds = Array.from(selectedTemplates.keys());
      const positions: Record<string, string> = {};

      // 获取角色 ID 和位置
      charactersWithPrompts.forEach((character) => {
        character.prompts.forEach((prompt) => {
          if (selectedTemplates.has(prompt.id)) {
            const position = selectedTemplates.get(prompt.id);
            if (position) {
              positions[prompt.character_id] = position;
            }
          }
        });
      });

      const res = await fetch(`/api/canvas/shot/${shotId}/compose-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_template_ids: templateIds,
          character_positions: Object.keys(positions).length > 0 ? positions : undefined,
          manual_adjustments: manualAdjustments || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "合成失败");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Prompt 合成成功");
      // 刷新分镜数据
      queryClient.invalidateQueries({ queryKey: ["shot-design", shotId] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("合成失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  // 切换角色展开状态
  const toggleCharacterExpand = useCallback((characterId: string) => {
    setExpandedCharacters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(characterId)) {
        newSet.delete(characterId);
      } else {
        newSet.add(characterId);
      }
      return newSet;
    });
  }, []);

  // 切换模板选择
  const toggleTemplateSelection = useCallback((templateId: string) => {
    setSelectedTemplates((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(templateId)) {
        newMap.delete(templateId);
      } else {
        newMap.set(templateId, undefined);
      }
      return newMap;
    });
  }, []);

  // 更新模板位置
  const updateTemplatePosition = useCallback((templateId: string, position: string | undefined) => {
    setSelectedTemplates((prev) => {
      const newMap = new Map(prev);
      newMap.set(templateId, position);
      return newMap;
    });
  }, []);

  // 处理合成
  const handleCompose = useCallback(() => {
    composeMutation.mutate();
  }, [composeMutation]);

  // 已选择的模板数量
  const selectedCount = selectedTemplates.size;

  // 复制 Prompt 预览
  const handleCopyPrompt = useCallback(() => {
    // 简单预览：合并选中的模板 Prompt
    const promptParts: string[] = [];
    charactersWithPrompts.forEach((character) => {
      character.prompts.forEach((prompt) => {
        if (selectedTemplates.has(prompt.id)) {
          promptParts.push(prompt.full_prompt);
        }
      });
    });
    if (manualAdjustments) {
      promptParts.push(manualAdjustments);
    }
    const preview = promptParts.join(", ");
    navigator.clipboard.writeText(preview);
    toast.success("已复制到剪贴板");
  }, [charactersWithPrompts, selectedTemplates, manualAdjustments]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px] bg-zinc-950 border-zinc-800">
        <SheetHeader>
          <SheetTitle className="text-white">绑定角色 Prompt</SheetTitle>
          <SheetDescription className="text-zinc-400">
            为分镜选择涉及的角色及其 Prompt 模板
          </SheetDescription>
        </SheetHeader>

        {/* 分镜描述 */}
        <div className="mt-4 p-3 bg-zinc-900 rounded border border-zinc-700">
          <Label className="text-xs text-zinc-500">分镜描述</Label>
          <p className="text-sm text-white mt-1">{shotDescription || "暂无描述"}</p>
        </div>

        <div className="py-4">
          {projectLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : charactersWithPrompts.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              <p>暂无可用角色</p>
              <p className="text-sm mt-2">请先在角色库中生成角色身份证</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-3 pr-4">
                {charactersWithPrompts.map((character) => (
                  <CharacterSelectionItem
                    key={character.id}
                    character={character}
                    expanded={expandedCharacters.has(character.id)}
                    onToggleExpand={() => toggleCharacterExpand(character.id)}
                    selectedTemplates={selectedTemplates}
                    onToggleTemplate={toggleTemplateSelection}
                    onUpdatePosition={updateTemplatePosition}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* 手动调整 */}
          <div className="mt-4 space-y-2">
            <Label className="text-zinc-300">补充描述（可选）</Label>
            <Textarea
              placeholder="添加额外的描述或调整..."
              value={manualAdjustments}
              onChange={(e) => setManualAdjustments(e.target.value)}
              rows={2}
              className="bg-zinc-900 border-zinc-700"
            />
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex items-center justify-between w-full text-sm text-zinc-400">
            <span>已选择 {selectedCount} 个角色 Prompt</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyPrompt}
              disabled={selectedCount === 0}
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              复制预览
            </Button>
          </div>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1"
              onClick={handleCompose}
              disabled={selectedCount === 0 || composeMutation.isPending}
            >
              {composeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  合成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  合成 Prompt
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// 角色选择项
interface CharacterSelectionItemProps {
  character: CharacterWithPrompts;
  expanded: boolean;
  onToggleExpand: () => void;
  selectedTemplates: Map<string, string | undefined>;
  onToggleTemplate: (templateId: string) => void;
  onUpdatePosition: (templateId: string, position: string | undefined) => void;
}

function CharacterSelectionItem({
  character,
  expanded,
  onToggleExpand,
  selectedTemplates,
  onToggleTemplate,
  onUpdatePosition,
}: CharacterSelectionItemProps) {
  const hasPrompts = character.prompts.length > 0;
  const selectedCount = character.prompts.filter((p) => selectedTemplates.has(p.id)).length;

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
      <Collapsible open={expanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full p-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors"
            disabled={!hasPrompts}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            )}

            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={character.image_url} alt={character.name} />
              <AvatarFallback className="bg-purple-600 text-white text-xs">
                {character.name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-left">
              <h4 className="font-medium text-white text-sm">{character.name}</h4>
            </div>

            {/* 状态指示 */}
            {!hasPrompts ? (
              <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">
                无 Prompt
              </Badge>
            ) : selectedCount > 0 ? (
              <Badge variant="default" className="bg-purple-600 text-xs">
                已选 {selectedCount}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">
                {character.prompts.length} 个模板
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-zinc-800 space-y-2">
            {character.prompts.map((template) => {
              const isSelected = selectedTemplates.has(template.id);
              const position = selectedTemplates.get(template.id);

              return (
                <div
                  key={template.id}
                  className={`p-2 rounded border ${
                    isSelected
                      ? "bg-purple-900/20 border-purple-500/50"
                      : "bg-zinc-800/50 border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleTemplate(template.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white">
                        {template.version === "base" ? "基础版" : template.variant_name}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pl-6">
                      <Label className="text-xs text-zinc-400">位置提示</Label>
                      <Select
                        value={position || ""}
                        onValueChange={(v) => onUpdatePosition(template.id, v || undefined)}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs bg-zinc-900 border-zinc-700">
                          <SelectValue placeholder="选择位置（可选）" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">不指定</SelectItem>
                          {POSITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Prompt 预览 */}
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      查看 Prompt
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 p-2 bg-zinc-900 rounded text-xs text-zinc-400 font-mono">
                      {template.full_prompt}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
