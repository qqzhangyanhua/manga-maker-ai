"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CharacterReference } from "../../types/character.types";

interface CharacterReferencePickerProps {
  characters: CharacterReference[];
  selectedId?: string | null;
  onSelect: (character?: CharacterReference | null) => void;
}

const DEFAULT_TAB = "recommended";

export function CharacterReferencePicker({ characters, selectedId, onSelect }: CharacterReferencePickerProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "training">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    characters.forEach((char) => {
      char.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return characters.filter((char) => {
      const status = (char.training_status ?? "pending") === "ready" ? "ready" : "training";
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesTag = tagFilter === "all" || char.tags?.includes(tagFilter);
      const matchesQuery =
        !normalizedQuery ||
        char.name.toLowerCase().includes(normalizedQuery) ||
        (char.description || "").toLowerCase().includes(normalizedQuery) ||
        char.tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesTag && matchesQuery;
    });
  }, [characters, query, statusFilter, tagFilter]);

  const readyCharacters = useMemo(
    () => filteredCharacters.filter((c) => (c.training_status ?? "pending") === "ready"),
    [filteredCharacters]
  );

  const pendingCharacters = useMemo(
    () => filteredCharacters.filter((c) => (c.training_status ?? "pending") !== "ready"),
    [filteredCharacters]
  );

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedId),
    [characters, selectedId]
  );

  const renderCard = (character: CharacterReference) => {
    const isSelected = selectedId === character.id;
    const status = character.training_status ?? "pending";

    return (
      <button
        type="button"
        key={character.id}
        onClick={() => onSelect(character)}
        className={cn(
          "flex items-center gap-3 w-full rounded-lg border p-3 text-left transition",
          isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
        )}
      >
        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted">
          {character.base_image_url ? (
            <img src={character.base_image_url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              无封面
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{character.name}</span>
            {status === "ready" ? (
              <Badge variant="secondary" className="text-[10px]">可用</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">训练中</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {character.description || "暂无描述"}
          </p>
          {character.views?.length ? (
            <p className="text-[10px] text-muted-foreground mt-1">
              参考图 {character.views.length} 张
            </p>
          ) : null}
        </div>
        {isSelected && <Badge>已选</Badge>}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {characters.length > 0 && (
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            placeholder="搜索角色名称、描述或标签"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={(v: "all" | "ready" | "training") => setStatusFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="ready">可用</SelectItem>
              <SelectItem value="training">训练中/未完成</SelectItem>
            </SelectContent>
          </Select>
          {availableTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger>
                <SelectValue placeholder="按标签筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部标签</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      <Tabs defaultValue={DEFAULT_TAB} className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="recommended">可用角色</TabsTrigger>
          <TabsTrigger value="pending" className="text-muted-foreground">
            待训练 / 未完成
          </TabsTrigger>
        </TabsList>
        <TabsContent value="recommended">
          {readyCharacters.length === 0 ? (
            <EmptyState />
          ) : (
            <ScrollArea className="h-72 pr-2 space-y-3">
              {readyCharacters.map(renderCard)}
            </ScrollArea>
          )}
        </TabsContent>
        <TabsContent value="pending">
          {pendingCharacters.length === 0 ? (
            <EmptyState message="暂无待训练角色" />
          ) : (
            <ScrollArea className="h-72 pr-2 space-y-3">
              {pendingCharacters.map(renderCard)}
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => onSelect(null)}>
        不使用角色参考
      </Button>
      {selectedCharacter?.views?.length ? (
        <div className="rounded-lg border p-3">
          <h4 className="text-xs text-muted-foreground mb-2">参考视图</h4>
          <div className="grid grid-cols-3 gap-2">
            {selectedCharacter.views.slice(0, 3).map((view) => (
              <div key={view.id} className="aspect-square rounded bg-muted overflow-hidden">
                {view.image_url ? (
                  <img src={view.image_url} alt={view.view_type} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                    {view.view_type}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        selectedCharacter && (
          <p className="text-xs text-muted-foreground">
            当前角色缺少参考视图，生成效果可能不稳定。
          </p>
        )
      )}
    </div>
  );
}

function EmptyState({ message = "暂无可用角色" }: { message?: string }) {
  return (
    <div className="h-72 flex flex-col items-center justify-center text-muted-foreground text-sm border rounded-lg">
      <p>{message}</p>
    </div>
  );
}
