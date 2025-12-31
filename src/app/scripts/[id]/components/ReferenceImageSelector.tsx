/**
 * 参考图选择对话框
 * 支持从多个来源选择参考图片
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Image as ImageIcon, User, Smile, Shirt, Move } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Panel } from "../types/script-editor.types";
import type { ReferenceImage } from "@/types/reference-image.types";

interface ReferenceImageSelectorProps {
  open: boolean;
  storyId?: string;
  panels: Panel[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (images: ReferenceImage[]) => void;
}

export function ReferenceImageSelector({
  open,
  storyId,
  panels,
  onOpenChange,
  onConfirm,
}: ReferenceImageSelectorProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 当前故事生成的图片
  const [storyImages, setStoryImages] = useState<ReferenceImage[]>([]);
  const [isLoadingStory, setIsLoadingStory] = useState(false);

  // 角色相关
  const [characters, setCharacters] = useState<Array<{
    id: string;
    name: string;
    base_image_url: string | null;
    reference_image: string | null;
  }>>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // 角色完整数据缓存（避免重复请求）
  const [characterDataCache, setCharacterDataCache] = useState<Record<string, {
    views: Array<{ id: string; image_url: string; view_type: string }>;
    expressions: Array<{ id: string; image_url: string; expression_type: string }>;
    outfits: Array<{ id: string; image_url: string; outfit_name: string }>;
    base_image_url: string | null;
  }>>({});

  // 三视图
  const [characterViews, setCharacterViews] = useState<ReferenceImage[]>([]);
  const [isLoadingViews, setIsLoadingViews] = useState(false);

  // 表情矩阵
  const [expressions, setExpressions] = useState<ReferenceImage[]>([]);
  const [isLoadingExpressions, setIsLoadingExpressions] = useState(false);

  // 服装管理
  const [outfits, setOutfits] = useState<ReferenceImage[]>([]);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);

  // 姿势变体
  const [poses, setPoses] = useState<ReferenceImage[]>([]);
  const [isLoadingPoses, setIsLoadingPoses] = useState(false);

  // 加载当前故事的图片
  async function loadStoryImages(): Promise<void> {
    setIsLoadingStory(true);
    try {
      const images: ReferenceImage[] = panels
        .filter(p => p.generated_image)
        .map(p => ({
          id: `panel-${p.id}`,
          url: p.generated_image || "",
          label: `分镜 #${p.panel_order}`,
          source: "story",
        }));
      setStoryImages(images);
    } finally {
      setIsLoadingStory(false);
    }
  }

  // 对话框打开时自动加载故事图片并重置选择状态
  useEffect(() => {
    if (open) {
      loadStoryImages();
      setSelectedIds([]); // 重置选中状态
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载故事角色
  async function loadCharacters(): Promise<void> {
    setIsLoadingCharacters(true);
    try {
      // 直接从角色库加载所有角色
      const response = await fetch("/api/character");
      if (!response.ok) throw new Error("加载角色失败");

      const data = await response.json();
      setCharacters(data.characters || []);
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCharacters(false);
    }
  }

  // 加载角色完整数据（缓存）
  async function loadCharacterData(characterId: string): Promise<void> {
    // 如果已缓存，直接使用
    if (characterDataCache[characterId]) {
      setSelectedCharacterId(characterId);
      updateCharacterAssets(characterId, characterDataCache[characterId]);
      return;
    }

    setIsLoadingViews(true);
    try {
      const response = await fetch(`/api/character/${characterId}`);
      if (!response.ok) throw new Error("加载角色数据失败");

      const data = await response.json();
      const character = data.character || data;

      // 缓存完整数据
      const characterData = {
        views: character.views || [],
        expressions: character.expressions || [],
        outfits: character.outfits || [],
        base_image_url: character.base_image_url,
      };

      setCharacterDataCache(prev => ({
        ...prev,
        [characterId]: characterData,
      }));

      setSelectedCharacterId(characterId);
      updateCharacterAssets(characterId, characterData);
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoadingViews(false);
    }
  }

  // 更新角色资产显示
  function updateCharacterAssets(characterId: string, data: {
    views: Array<{ id: string; image_url: string; view_type: string }>;
    expressions: Array<{ id: string; image_url: string; expression_type: string }>;
    outfits: Array<{ id: string; image_url: string; outfit_name: string }>;
    base_image_url: string | null;
  }): void {
    const views: ReferenceImage[] = [];

    // 添加基础参考图
    if (data.base_image_url) {
      views.push({
        id: `base-${characterId}`,
        url: data.base_image_url,
        label: "基础参考图",
        source: "view",
      });
    }

    // 添加三视图
    const threeViews = data.views
      .filter(v => v.image_url)
      .map(v => ({
        id: `view-${v.id}`,
        url: v.image_url,
        label: `${v.view_type}视图`,
        source: "view",
      }));
    views.push(...threeViews);

    setCharacterViews(views);

    // 同时准备表情和服装数据（不立即加载，Tab 切换时显示）
    const exprs: ReferenceImage[] = data.expressions
      .filter(e => e.image_url)
      .map(e => ({
        id: `expr-${e.id}`,
        url: e.image_url,
        label: `${e.expression_type}表情`,
        source: "expression",
      }));
    setExpressions(exprs);

    const outfitList: ReferenceImage[] = data.outfits
      .filter(o => o.image_url)
      .map(o => ({
        id: `outfit-${o.id}`,
        url: o.image_url,
        label: o.outfit_name,
        source: "outfit",
      }));
    setOutfits(outfitList);
  }

  // 切换选中状态
  function toggleImage(id: string): void {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  // 确认选择
  function handleConfirm(): void {
    const allImages = [...storyImages, ...characterViews, ...expressions, ...outfits, ...poses];
    const selected = allImages.filter(img => selectedIds.includes(img.id));
    onConfirm(selected);
    onOpenChange(false);
  }

  // 渲染图片网格
  function renderImageGrid(images: ReferenceImage[], loading: boolean): JSX.Element {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          暂无图片
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-3">
        {images.map(img => {
          const isSelected = selectedIds.includes(img.id);
          return (
            <div
              key={img.id}
              onClick={() => toggleImage(img.id)}
              className={`
                relative border rounded-lg p-2 cursor-pointer transition-all
                ${isSelected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"}
              `}
            >
              <Checkbox
                checked={isSelected}
                className="absolute top-2 left-2 z-10"
              />
              <img
                src={img.url}
                alt={img.label}
                className="w-full h-32 object-cover rounded"
              />
              <p className="text-xs text-center mt-2 truncate">{img.label}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>选择参考图</DialogTitle>
          <DialogDescription>
            选择用于生成多格图片的参考图片，已选中 {selectedIds.length} 张
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="story" className="w-full" onValueChange={(value) => {
          // 切换到需要角色的tab时，自动加载角色列表
          if (["views", "expressions", "outfits", "poses"].includes(value) && characters.length === 0) {
            loadCharacters();
          }
          // 切换到故事图片时，自动加载
          if (value === "story" && storyImages.length === 0) {
            loadStoryImages();
          }
        }}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="story">
              <ImageIcon className="w-4 h-4 mr-1" />
              故事图片
            </TabsTrigger>
            <TabsTrigger value="views">
              <User className="w-4 h-4 mr-1" />
              三视图
            </TabsTrigger>
            <TabsTrigger value="expressions">
              <Smile className="w-4 h-4 mr-1" />
              表情
            </TabsTrigger>
            <TabsTrigger value="outfits">
              <Shirt className="w-4 h-4 mr-1" />
              服装
            </TabsTrigger>
            <TabsTrigger value="poses">
              <Move className="w-4 h-4 mr-1" />
              姿势
            </TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="space-y-4">
            {renderImageGrid(storyImages, isLoadingStory)}
          </TabsContent>

          <TabsContent value="views" className="space-y-4">
            {/* 角色选择 */}
            {isLoadingCharacters ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">选择角色</label>
                <div className="grid grid-cols-4 gap-2">
                  {characters.map(char => (
                    <Button
                      key={char.id}
                      variant={selectedCharacterId === char.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadCharacterData(char.id)}
                    >
                      {char.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 三视图 */}
            {selectedCharacterId && renderImageGrid(characterViews, isLoadingViews)}
          </TabsContent>

          <TabsContent value="expressions" className="space-y-4">
            {/* 角色选择 */}
            {isLoadingCharacters ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">选择角色</label>
                <div className="grid grid-cols-4 gap-2">
                  {characters.map(char => (
                    <Button
                      key={char.id}
                      variant={selectedCharacterId === char.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadCharacterData(char.id)}
                    >
                      {char.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 表情矩阵 */}
            {selectedCharacterId && renderImageGrid(expressions, false)}
          </TabsContent>

          <TabsContent value="outfits" className="space-y-4">
            {/* 角色选择 */}
            {isLoadingCharacters ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">选择角色</label>
                <div className="grid grid-cols-4 gap-2">
                  {characters.map(char => (
                    <Button
                      key={char.id}
                      variant={selectedCharacterId === char.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadCharacterData(char.id)}
                    >
                      {char.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 服装管理 */}
            {selectedCharacterId && renderImageGrid(outfits, false)}
          </TabsContent>

          <TabsContent value="poses" className="space-y-4">
            {/* 姿势功能暂未实现 */}
            <div className="text-center py-12 space-y-3">
              <Move className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">姿势变体功能即将上线</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确定 ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
