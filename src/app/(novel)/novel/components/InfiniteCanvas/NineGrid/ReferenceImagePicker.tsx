"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useProjectReferenceImages } from "./hooks/useProjectReferenceImages";
import type { ReferenceImage, ReferenceImageSource } from "./types";

interface ReferenceImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  characterId: string;
  characterName: string;
  selectedImages: ReferenceImage[];
  onConfirm: (images: ReferenceImage[]) => void;
  maxImages?: number;
}

export function ReferenceImagePicker({
  open,
  onOpenChange,
  projectId,
  characterId,
  characterName,
  selectedImages,
  onConfirm,
  maxImages = 5,
}: ReferenceImagePickerProps) {
  const [localSelected, setLocalSelected] = useState<ReferenceImage[]>(selectedImages);
  const [activeTab, setActiveTab] = useState<ReferenceImageSource>("character_avatar");

  const { data, isLoading } = useProjectReferenceImages({
    projectId,
    types: ["shot_image", "scene", "final"],
  });

  const toggleImage = (image: ReferenceImage) => {
    setLocalSelected((prev) => {
      const exists = prev.find((img) => img.id === image.id);
      if (exists) {
        return prev.filter((img) => img.id !== image.id);
      }
      if (prev.length >= maxImages) {
        return prev;
      }
      return [...prev, image];
    });
  };

  const isSelected = (imageId: string) => {
    return localSelected.some((img) => img.id === imageId);
  };

  const handleConfirm = () => {
    onConfirm(localSelected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>选择参考图 - {characterName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReferenceImageSource)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="character_avatar">角色头像</TabsTrigger>
            <TabsTrigger value="shot_image">镜头图片</TabsTrigger>
            <TabsTrigger value="scene">场景库</TabsTrigger>
            <TabsTrigger value="final">最终分镜</TabsTrigger>
          </TabsList>

          {/* 角色头像标签页 */}
          <TabsContent value="character_avatar">
            <ScrollArea className="h-[400px]">
              <div className="text-center text-muted-foreground py-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>角色头像功能开发中...</p>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 镜头图片标签页 */}
          <TabsContent value="shot_image">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : data?.shots && data.shots.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 p-4">
                  {data.shots.map((shot) => {
                    const image: ReferenceImage = {
                      id: shot.id,
                      url: shot.url,
                      source: "shot_image",
                      sourceId: shot.id,
                      metadata: {
                        chapterNumber: shot.chapterNumber,
                        shotOrder: shot.shotOrder,
                        description: shot.description,
                      },
                    };

                    return (
                      <div
                        key={shot.id}
                        className="relative group cursor-pointer"
                        onClick={() => toggleImage(image)}
                      >
                        <div
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected(shot.id)
                              ? "border-primary ring-2 ring-primary"
                              : "border-transparent hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={shot.url}
                            alt={`第${shot.chapterNumber}章 镜头${shot.shotOrder}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Checkbox checked={isSelected(shot.id)} />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                            第{shot.chapterNumber}章 #{shot.shotOrder}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无镜头图片</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 场景库标签页 */}
          <TabsContent value="scene">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : data?.scenes && data.scenes.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 p-4">
                  {data.scenes.map((scene) => {
                    const image: ReferenceImage = {
                      id: scene.id,
                      url: scene.url,
                      source: "scene",
                      sourceId: scene.id,
                      metadata: {
                        sceneName: scene.name,
                      },
                    };

                    return (
                      <div
                        key={scene.id}
                        className="relative group cursor-pointer"
                        onClick={() => toggleImage(image)}
                      >
                        <div
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected(scene.id)
                              ? "border-primary ring-2 ring-primary"
                              : "border-transparent hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={scene.url}
                            alt={scene.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            <Checkbox checked={isSelected(scene.id)} />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                            {scene.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无场景图片</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 最终分镜标签页 */}
          <TabsContent value="final">
            <ScrollArea className="h-[400px]">
              <div className="text-center text-muted-foreground py-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>最终分镜功能开发中...</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <p className="text-xs text-muted-foreground mr-auto">
            已选 {localSelected.length}/{maxImages} 张
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            确定 ({localSelected.length}张)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
