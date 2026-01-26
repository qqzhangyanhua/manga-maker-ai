"use client";

/**
 * 角色库抽屉组件
 * 
 * 管理项目角色和角色身份证 Prompt
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { CharacterPromptTemplate } from "@/types/character-prompt";
import { CharacterPromptEditorDialog } from "./CharacterPromptEditorDialog";

// 角色信息接口（从 NovelProject.characters JSON 字段获取）
interface NovelCharacter {
  id: string;
  name: string;
  description?: string;
  appearance?: string;
  personality?: string;
  role?: string;
  image_url?: string;
}

interface CharacterLibraryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novelProjectId: string;
  timelineId: string;
}

export function CharacterLibraryDrawer({
  open,
  onOpenChange,
  novelProjectId,
  timelineId,
}: CharacterLibraryDrawerProps) {
  const queryClient = useQueryClient();
  
  // 展开的角色 ID
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());
  
  // Prompt 编辑器状态
  const [editorState, setEditorState] = useState<{
    open: boolean;
    characterId: string | null;
    characterName: string;
    templateId: string | null;
    mode: "create_base" | "create_variant" | "edit";
  }>({
    open: false,
    characterId: null,
    characterName: "",
    templateId: null,
    mode: "create_base",
  });

  // 获取小说项目的角色列表
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ["novel-project-characters", novelProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/novel/projects/${novelProjectId}`);
      if (!res.ok) throw new Error("获取项目信息失败");
      return res.json();
    },
    enabled: open && !!novelProjectId,
  });

  // 获取时间线的小说角色列表（用于显示哪些角色已绑定到章节）
  const { data: timelineCharactersData } = useQuery({
    queryKey: ["timeline-novel-characters", timelineId],
    queryFn: async () => {
      const res = await fetch(`/api/canvas/timeline/${timelineId}/novel-characters`);
      if (!res.ok) throw new Error("获取时间线角色失败");
      return res.json();
    },
    enabled: open && !!timelineId,
  });

  // 提取角色列表
  const characters: NovelCharacter[] = projectData?.project?.characters || [];

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

  // 打开创建基础版 Prompt 对话框
  const handleCreateBasePrompt = useCallback((character: NovelCharacter) => {
    setEditorState({
      open: true,
      characterId: character.id,
      characterName: character.name,
      templateId: null,
      mode: "create_base",
    });
  }, []);

  // 打开创建变体版本对话框
  const handleCreateVariant = useCallback((character: NovelCharacter) => {
    setEditorState({
      open: true,
      characterId: character.id,
      characterName: character.name,
      templateId: null,
      mode: "create_variant",
    });
  }, []);

  // 打开编辑对话框
  const handleEditTemplate = useCallback((character: NovelCharacter, templateId: string) => {
    setEditorState({
      open: true,
      characterId: character.id,
      characterName: character.name,
      templateId,
      mode: "edit",
    });
  }, []);

  // 关闭编辑器
  const handleEditorClose = useCallback(() => {
    setEditorState((prev) => ({ ...prev, open: false }));
  }, []);

  // 编辑器保存成功后刷新数据
  const handleEditorSuccess = useCallback(() => {
    // 刷新角色 Prompt 数据
    if (editorState.characterId) {
      queryClient.invalidateQueries({
        queryKey: ["character-prompts", editorState.characterId],
      });
    }
    handleEditorClose();
  }, [editorState.characterId, queryClient, handleEditorClose]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[500px] sm:max-w-[500px] bg-zinc-950 border-zinc-800">
          <SheetHeader>
            <SheetTitle className="text-white">角色库</SheetTitle>
            <SheetDescription className="text-zinc-400">
              管理项目角色和角色身份证 Prompt
            </SheetDescription>
          </SheetHeader>

          <div className="py-4">
            {projectLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : characters.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                <p>暂无角色</p>
                <p className="text-sm mt-2">请先在小说项目中添加角色</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="space-y-3 pr-4">
                  {characters.map((character) => (
                    <CharacterItem
                      key={character.id}
                      character={character}
                      expanded={expandedCharacters.has(character.id)}
                      onToggleExpand={() => toggleCharacterExpand(character.id)}
                      onCreateBasePrompt={() => handleCreateBasePrompt(character)}
                      onCreateVariant={() => handleCreateVariant(character)}
                      onEditTemplate={(templateId) => handleEditTemplate(character, templateId)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Prompt 编辑器对话框 */}
      {editorState.characterId && (
        <CharacterPromptEditorDialog
          open={editorState.open}
          onOpenChange={(open) => {
            if (!open) handleEditorClose();
          }}
          characterId={editorState.characterId}
          characterName={editorState.characterName}
          templateId={editorState.templateId}
          mode={editorState.mode}
          onSuccess={handleEditorSuccess}
        />
      )}
    </>
  );
}

// 单个角色卡片组件
interface CharacterItemProps {
  character: NovelCharacter;
  expanded: boolean;
  onToggleExpand: () => void;
  onCreateBasePrompt: () => void;
  onCreateVariant: () => void;
  onEditTemplate: (templateId: string) => void;
}

function CharacterItem({
  character,
  expanded,
  onToggleExpand,
  onCreateBasePrompt,
  onCreateVariant,
  onEditTemplate,
}: CharacterItemProps) {
  const queryClient = useQueryClient();

  // 获取该角色的所有 Prompt 模板
  const { data: promptsData, isLoading: promptsLoading } = useQuery({
    queryKey: ["character-prompts", character.id],
    queryFn: async () => {
      const res = await fetch(`/api/canvas/character/${character.id}/prompts`);
      if (!res.ok) throw new Error("获取角色 Prompt 失败");
      return res.json();
    },
    enabled: expanded, // 只在展开时加载
  });

  // 删除 Prompt 模板
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/canvas/character-prompt/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "删除失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("删除成功");
      queryClient.invalidateQueries({
        queryKey: ["character-prompts", character.id],
      });
    },
    onError: (error) => {
      toast.error("删除失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  const handleDeleteTemplate = useCallback((templateId: string, templateName: string) => {
    if (confirm(`确定要删除「${templateName}」吗？`)) {
      deleteMutation.mutate(templateId);
    }
  }, [deleteMutation]);

  const prompts: CharacterPromptTemplate[] = promptsData?.prompts || [];
  const hasBasePrompt = prompts.some((p) => p.version === "base");

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
      {/* 角色头部 */}
      <Collapsible open={expanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            )}
            
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={character.image_url} alt={character.name} />
              <AvatarFallback className="bg-purple-600 text-white">
                {character.name[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-left">
              <h4 className="font-medium text-white">{character.name}</h4>
              {character.role && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {character.role}
                </Badge>
              )}
            </div>
            
            {/* 状态指示 */}
            {hasBasePrompt ? (
              <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                已配置
              </Badge>
            ) : (
              <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs">
                未配置
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-zinc-800">
            {/* 角色描述 */}
            {character.description && (
              <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                {character.description}
              </p>
            )}

            {/* Prompt 模板列表 */}
            {promptsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {prompts.map((template) => (
                  <div
                    key={template.id}
                    className="p-2 bg-zinc-800/50 rounded flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">
                          {template.version === "base" ? "基础版" : template.variant_name}
                        </span>
                        {template.version === "base" && (
                          <Badge variant="secondary" className="text-xs">
                            默认
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-1">
                        {template.full_prompt}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => onEditTemplate(template.id)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      {template.version === "variant" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteTemplate(
                            template.id,
                            template.variant_name || "基础版"
                          )}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-3">
                  {!hasBasePrompt ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={onCreateBasePrompt}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      生成基础 Prompt
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={onCreateVariant}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      添加变体版本
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
