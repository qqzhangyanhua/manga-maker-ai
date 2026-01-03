"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssetLibrarySidebarProps, Character, Scene } from "./types";

export function AssetLibrarySidebar({
  storyId,
  projectId,
  characters,
  scenes = [],
  isLoading = false,
  onCharacterSelect,
  onSceneSelect,
}: AssetLibrarySidebarProps) {
  const [activeTab, setActiveTab] = useState<"characters" | "scenes">("characters");

  return (
    <div className="h-full flex flex-col bg-[#0f0f13]">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <TabsList className="w-full bg-[#1a1a1f] border-b border-gray-800">
          <TabsTrigger value="characters" className="flex-1">
            <User className="w-4 h-4 mr-2" />
            角色
          </TabsTrigger>
          <TabsTrigger value="scenes" className="flex-1">
            <ImageIcon className="w-4 h-4 mr-2" />
            场景
          </TabsTrigger>
        </TabsList>

        <TabsContent value="characters" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : characters.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">暂无角色</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4">
                {characters.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onSelect={onCharacterSelect}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="scenes" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            {scenes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">暂无场景</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4">
                {scenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    onSelect={onSceneSelect}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CharacterCard({
  character,
  onSelect,
}: {
  character: Character;
  onSelect?: (character: Character) => void;
}) {
  const imageUrl = character.base_image_url || character.reference_image;

  return (
    <button
      onClick={() => onSelect?.(character)}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden",
        "bg-[#1a1a1f] border border-gray-800",
        "hover:border-orange-500 transition-all",
        "focus:outline-none focus:ring-2 focus:ring-orange-500"
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={character.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <User className="w-8 h-8 text-gray-600" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-white font-medium truncate">{character.name}</p>
      </div>
    </button>
  );
}

function SceneCard({
  scene,
  onSelect,
}: {
  scene: Scene;
  onSelect?: (scene: Scene) => void;
}) {
  return (
    <button
      onClick={() => onSelect?.(scene)}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden",
        "bg-[#1a1a1f] border border-gray-800",
        "hover:border-orange-500 transition-all",
        "focus:outline-none focus:ring-2 focus:ring-orange-500"
      )}
    >
      {scene.image_url ? (
        <img
          src={scene.image_url}
          alt={scene.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-600" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="text-xs text-white font-medium truncate">{scene.name}</p>
        {scene.scene_type && (
          <p className="text-xs text-gray-400 truncate">{scene.scene_type}</p>
        )}
      </div>
    </button>
  );
}
