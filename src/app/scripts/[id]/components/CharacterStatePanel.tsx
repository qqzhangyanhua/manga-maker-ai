/**
 * Character State Panel - Displays character states at the end of a chapter
 * Phase 4: Enhanced chapter context tracking
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, MapPin, Heart, Brain, Package, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CharacterState {
  id: string;
  character: {
    id: string;
    name: string;
  };
  location: string | null;
  physical_condition: string | null;
  mental_state: string | null;
  key_items: string[];
  relationship_changes: Record<string, string> | null;
  notes: string | null;
}

interface CharacterStatePanelProps {
  chapterId: string;
  onRefresh?: () => void;
}

export function CharacterStatePanel({ chapterId, onRefresh }: CharacterStatePanelProps) {
  const [states, setStates] = useState<CharacterState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacterStates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chapter/${chapterId}/character-states`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "获取失败");
      }

      const data = await response.json();
      setStates(data.states || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchCharacterStates();
  }, [fetchCharacterStates]);

  function handleRefresh() {
    fetchCharacterStates();
    onRefresh?.();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-xs">加载角色状态...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 bg-destructive/10 rounded text-destructive-foreground text-xs">
        <div className="font-medium mb-1">加载失败</div>
        <div>{error}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="mt-2 h-7 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          重试
        </Button>
      </div>
    );
  }

  if (states.length === 0) {
    return (
      <div className="p-2 bg-muted/50 rounded text-muted-foreground text-xs">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4" />
          <span className="font-medium">暂无角色状态</span>
        </div>
        <div className="text-xs">
          点击章节菜单中的「分析角色状态」来生成状态记录
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>角色状态 ({states.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-6 w-6 p-0"
          title="刷新"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {states.map((state) => (
        <div
          key={state.id}
          className="p-2 bg-muted/30 rounded border border-border/50 space-y-1.5"
        >
          {/* Character name */}
          <div className="font-medium text-sm flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-primary" />
            {state.character.name}
          </div>

          {/* Location */}
          {state.location && (
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" />
              <div>
                <span className="text-muted-foreground">位置: </span>
                <span>{state.location}</span>
              </div>
            </div>
          )}

          {/* Physical condition */}
          {state.physical_condition && (
            <div className="flex items-start gap-2 text-xs">
              <Heart className="w-3 h-3 mt-0.5 text-red-500 shrink-0" />
              <div>
                <span className="text-muted-foreground">身体: </span>
                <span>{state.physical_condition}</span>
              </div>
            </div>
          )}

          {/* Mental state */}
          {state.mental_state && (
            <div className="flex items-start gap-2 text-xs">
              <Brain className="w-3 h-3 mt-0.5 text-purple-500 shrink-0" />
              <div>
                <span className="text-muted-foreground">心理: </span>
                <span>{state.mental_state}</span>
              </div>
            </div>
          )}

          {/* Key items */}
          {state.key_items && state.key_items.length > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <Package className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
              <div className="flex-1">
                <span className="text-muted-foreground">持有: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {state.key_items.map((item, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] h-5 px-1.5"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Relationship changes */}
          {state.relationship_changes &&
            Object.keys(state.relationship_changes).length > 0 && (
              <div className="flex items-start gap-2 text-xs">
                <Users className="w-3 h-3 mt-0.5 text-green-500 shrink-0" />
                <div className="flex-1">
                  <span className="text-muted-foreground">关系变化: </span>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(state.relationship_changes).map(([charName, change]) => (
                      <div key={charName} className="text-xs">
                        <span className="font-medium">{charName}</span>: {change}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          {/* Notes */}
          {state.notes && (
            <div className="text-xs text-muted-foreground italic border-t border-border/50 pt-1.5 mt-1.5">
              {state.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
