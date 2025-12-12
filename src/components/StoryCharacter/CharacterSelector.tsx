"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { User, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleSelector } from "./RoleSelector";
import type { CharacterRole, CharacterWithAssets } from "./types";

interface CharacterSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeIds: string[];
  onSelect: (characterId: string, role: CharacterRole) => Promise<void>;
  isLoading?: boolean;
}

export function CharacterSelector({
  open,
  onOpenChange,
  excludeIds,
  onSelect,
  isLoading,
}: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<CharacterWithAssets[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<CharacterRole>("supporting");

  // Fetch characters when modal opens
  useEffect(() => {
    if (open) {
      fetchCharacters();
    }
  }, [open]);

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/character");
      if (res.ok) {
        const data = await res.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error("Failed to fetch characters:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter characters
  const filteredCharacters = characters.filter((char) => {
    // Exclude already added characters
    if (excludeIds.includes(char.id)) return false;
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        char.name.toLowerCase().includes(query) ||
        char.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleConfirm = async () => {
    if (!selectedId) return;
    await onSelect(selectedId, selectedRole);
    setSelectedId(null);
    setSelectedRole("supporting");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>从角色库选择角色</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索角色..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Character grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {characters.length === 0
                ? "角色库为空，请先创建角色"
                : excludeIds.length === characters.length
                ? "所有角色都已添加到故事中"
                : "没有找到匹配的角色"}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {filteredCharacters.map((char) => {
                const imageUrl =
                  char.reference_image ||
                  char.base_image_url ||
                  char.expressions?.[0]?.image_url;
                const isSelected = selectedId === char.id;

                return (
                  <button
                    key={char.id}
                    onClick={() => setSelectedId(char.id)}
                    className={`
                      p-3 rounded-lg border text-left transition-all
                      ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      }
                    `}
                  >
                    <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted mb-2">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={char.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="font-medium text-sm truncate">
                      {char.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {char.expressions?.length || 0} 表情 ·{" "}
                      {char.outfits?.length || 0} 服装
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">角色类型:</span>
            <RoleSelector value={selectedRole} onChange={setSelectedRole} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedId || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  添加中...
                </>
              ) : (
                "添加到故事"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
