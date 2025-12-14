"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Sparkles, Wand2, UploadCloud, UserPlus, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CharacterReferencePicker } from "./CharacterReferencePicker";
import { ReferenceImageSelector } from "../ReferenceImageSelector";
import type { Panel } from "../../types/script-editor.types";
import type { CharacterReference } from "../../types/character.types";
import CreateCharacterDialog from "@/components/AssetLibrary/CreateCharacterDialog";
import type { CharacterAsset } from "@/components/AssetLibrary/CharacterLibrary";
import ImageUploadDialog from "@/components/AssetLibrary/ImageUploadDialog";

interface ReferenceImage {
  id: string;
  url: string;
  label: string;
  source: string;
}

interface ReferenceGuidedGenerationDialogProps {
  open: boolean;
  panel: Panel | null;
  allPanels?: Panel[];
  storyId?: string;
  characters: CharacterReference[];
  onCharactersRefresh?: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  onGenerated: (panelId: string, imageUrl: string) => void;
  onPromptUpdated?: (panelId: string, prompt: string) => void;
}

type ViewType = "front" | "side" | "back";
const VIEW_LABELS: Record<ViewType, string> = {
  front: "正面",
  side: "侧面",
  back: "背面",
};

function mapAssetToReference(character: CharacterAsset): CharacterReference {
  return {
    id: character.id,
    name: character.name,
    description: character.description,
    base_image_url: character.base_image_url || null,
    tags: character.tags,
    training_status: character.training_status,
    views: character.views,
    expressions: character.expressions,
    outfits: character.outfits,
  };
}

export function ReferenceGuidedGenerationDialog({
  open,
  panel,
  allPanels,
  storyId,
  characters,
  onCharactersRefresh,
  onOpenChange,
  onGenerated,
  onPromptUpdated,
}: ReferenceGuidedGenerationDialogProps) {
  const { toast } = useToast();
  const [characterList, setCharacterList] = useState<CharacterReference[]>(characters);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(panel?.prompt_used || panel?.visual_prompt || panel?.description || "");
  const [softMode, setSoftMode] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<string | undefined>(undefined);
  const [isBuildingPrompt, setIsBuildingPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadViewType, setUploadViewType] = useState<ViewType>("front");
  const [isUploadingView, setIsUploadingView] = useState(false);

  // 参考图片选择状态
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceSelectorOpen, setReferenceSelectorOpen] = useState(false);

  useEffect(() => {
    setCharacterList(characters);
    setSelectedCharacterId((prev) => {
      if (prev && characters.some((char) => char.id === prev)) {
        return prev;
      }
      const fallback =
        characters.find((c) => (c.training_status ?? "pending") === "ready") || characters[0];
      return fallback?.id || null;
    });
  }, [characters]);

  const selectedCharacter = useMemo(
    () => characterList.find((c) => c.id === selectedCharacterId) || null,
    [characterList, selectedCharacterId]
  );

  useEffect(() => {
    if (panel) {
      setPrompt(panel.prompt_used || panel.visual_prompt || panel.description || "");
    }
  }, [panel]);

  const resetState = () => {
    setSoftMode(true);
    setAspectRatio(undefined);
    setIsBuildingPrompt(false);
    setIsGenerating(false);
    setReferenceImages([]);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetState();
    }
    onOpenChange(openState);
  };

  const handleBuildPrompt = async () => {
    if (!panel) return;
    setIsBuildingPrompt(true);
    try {
      const response = await fetch("/api/panel/build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_id: panel.id,
          character_id: selectedCharacter?.id,
          soften: softMode,
          aspect_ratio: aspectRatio,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "生成提示词失败");
      }

      setPrompt(data.prompt);
      onPromptUpdated?.(panel.id, data.prompt);
      toast({ title: "提示词已更新", description: "已注入角色参考信息" });
    } catch (error) {
      toast({
        title: "生成提示词失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsBuildingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!panel) return;
    if (!prompt) {
      toast({ title: "请先生成提示词", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/panel/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_id: panel.id,
          prompt,
          wait: true,
          reference_image_urls: referenceImages.map(img => img.url),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      if (data.image_url) {
        onGenerated(panel.id, data.image_url);
        toast({ title: "生成成功", description: "已根据角色参考生成分镜图像" });
        handleClose(false);
      } else {
        toast({ title: "任务已提交", description: "后台生成中，请稍后查看" });
      }
    } catch (error) {
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openUploadDialog = (viewType: ViewType) => {
    if (!selectedCharacter) {
      toast({
        title: "请先选择角色",
        description: "需要先选择角色才能上传对应三视图",
        variant: "destructive",
      });
      return;
    }
    setUploadViewType(viewType);
    setUploadDialogOpen(true);
  };

  const handleCharacterCreated = async (character: CharacterAsset) => {
    const mapped = mapAssetToReference(character);
    setCharacterList((prev) => [mapped, ...prev.filter((c) => c.id !== mapped.id)]);
    setSelectedCharacterId(mapped.id);
    await onCharactersRefresh?.();
  };

  const handleUploadReferenceView = async (base64Image: string) => {
    if (!selectedCharacter) {
      toast({
        title: "请先选择角色",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingView(true);
    try {
      const response = await fetch(base64Image);
      const blob = await response.blob();
      const file = new File([blob], `${uploadViewType}.png`, { type: blob.type || "image/png" });

      const formData = new FormData();
      formData.append("character_id", selectedCharacter.id);
      formData.append("type", "view");
      formData.append("sub_type", uploadViewType);
      formData.append("file", file);

      const uploadResponse = await fetch("/api/character/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(data.error || "上传失败");
      }

      const updateViews = (views: CharacterReference["views"]) => {
        const list = [...(views || [])];
        const index = list.findIndex((v) => v.view_type === uploadViewType);
        if (index >= 0) {
          list[index] = { ...list[index], image_url: data.image_url };
        } else {
          list.push({
            id: `${uploadViewType}-${Date.now()}`,
            view_type: uploadViewType,
            image_url: data.image_url,
          });
        }
        return list;
      };

      setCharacterList((prev) =>
        prev.map((char) =>
          char.id === selectedCharacter.id ? { ...char, views: updateViews(char.views) } : char
        )
      );

      toast({
        title: "上传成功",
        description: `${VIEW_LABELS[uploadViewType]}视图已更新`,
      });
      await onCharactersRefresh?.();
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsUploadingView(false);
    }
  };

  if (!panel) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>角色参考辅助生成</DialogTitle>
          <DialogDescription>
            锁定角色外观 + 自动注入三明治 Prompt，确保角色在不同分镜中的一致性
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">分镜预览</Label>
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">#{panel.panel_order} {panel.panel_type}</p>
                    <p className="text-xs text-muted-foreground">{panel.camera_angle} · {panel.shot_size}</p>
                  </div>
                  <Badge variant="outline">{panel.importance}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{panel.description || "暂无描述"}</p>
                {panel.dialogue && (
                  <p className="text-xs italic text-muted-foreground">对白：{panel.dialogue}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>提示词</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={softMode}
                    onChange={(e) => setSoftMode(e.target.checked)}
                  />
                  软化危险词
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={aspectRatio === "16:9"}
                    onChange={(e) => setAspectRatio(e.target.checked ? "16:9" : undefined)}
                  />
                  16:9 镜头
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleBuildPrompt} disabled={isBuildingPrompt}>
                {isBuildingPrompt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Wand2 className="w-4 h-4 mr-2" />重写提示词
              </Button>
              <Button type="button" onClick={handleGenerate} disabled={isGenerating || !prompt}>
                {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Sparkles className="w-4 h-4 mr-2" />立即生成
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>角色锁定</Label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  创建角色
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedCharacter || isUploadingView}
                    >
                      <UploadCloud className="w-4 h-4 mr-1" />
                      补充三视图
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {(Object.keys(VIEW_LABELS) as ViewType[]).map((view) => (
                      <DropdownMenuItem
                        key={view}
                        onClick={() => openUploadDialog(view)}
                        disabled={!selectedCharacter}
                      >
                        {VIEW_LABELS[view]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CharacterReferencePicker
              characters={characterList}
              selectedId={selectedCharacterId}
              onSelect={(char) => setSelectedCharacterId(char?.id || null)}
            />

            {/* 参考图片选择 */}
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Label>参考图片 (可选)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReferenceSelectorOpen(true)}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  选择参考图
                </Button>
              </div>
              {referenceImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 p-2 border rounded-lg bg-muted/20">
                  {referenceImages.map(img => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => setReferenceImages(prev => prev.filter(i => i.id !== img.id))}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-center mt-1 truncate">{img.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {referenceImages.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  未选择参考图，将自动使用角色的默认参考图
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            取消
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt}>
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            基于角色参考生成
          </Button>
        </DialogFooter>

        <CreateCharacterDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCharacterCreated}
        />

        <ImageUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUploadSuccess={handleUploadReferenceView}
          title={`上传${VIEW_LABELS[uploadViewType]}视图`}
          description="拖拽或点击上传角色参考图"
        />

        {/* 参考图选择对话框 */}
        <ReferenceImageSelector
          open={referenceSelectorOpen}
          storyId={storyId}
          panels={allPanels || (panel ? [panel] : [])}
          onOpenChange={setReferenceSelectorOpen}
          onConfirm={(images) => {
            setReferenceImages(images);
            toast({
              title: "已选择参考图",
              description: `已添加 ${images.length} 张参考图`,
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
