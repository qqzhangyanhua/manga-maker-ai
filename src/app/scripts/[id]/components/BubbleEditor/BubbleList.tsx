/**
 * 气泡列表管理组件
 */

"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeechBubble, BUBBLE_PRESETS } from "./types";

export interface BubbleListProps {
  bubbles: SpeechBubble[];
  editingPanelId: string | null;
  selectedBubbleId: string | null;
  onAddBubble: () => void;
  onSelectBubble: (id: string | null) => void;
  onDeleteBubble: (id: string) => void;
  onMoveLayer?: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
}

export function BubbleList({
  bubbles,
  editingPanelId,
  selectedBubbleId,
  onAddBubble,
  onSelectBubble,
  onDeleteBubble,
  onMoveLayer,
}: BubbleListProps) {
  // 过滤当前编辑分镜的气泡
  const filteredBubbles = editingPanelId
    ? bubbles.filter((b) => b.panelId === editingPanelId)
    : bubbles;

  return (
    <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">
          已添加气泡 ({filteredBubbles.length})
        </h3>
        <Button
          size="sm"
          onClick={onAddBubble}
          disabled={!editingPanelId}
          className="h-7 text-xs bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-3 h-3 mr-1" />
          添加
        </Button>
      </div>

      <ScrollArea className="h-[200px]">
        {filteredBubbles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              {editingPanelId ? "暂无气泡" : "请先选择分镜"}
            </p>
            {editingPanelId && (
              <p className="text-xs text-gray-600 mt-1">
                点击上方"添加"或选择气泡样式开始
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBubbles.map((bubble, index) => {
              const isSelected = selectedBubbleId === bubble.id;
              const preset = BUBBLE_PRESETS[bubble.type];

              return (
                <div
                  key={bubble.id}
                  onClick={() => onSelectBubble(bubble.id)}
                  className={cn(
                    "p-2 rounded border cursor-pointer transition-colors",
                    isSelected
                      ? "border-orange-500 bg-gray-800/50"
                      : "border-gray-700 hover:border-gray-600"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg flex-shrink-0">{preset.icon}</span>
                      <div className="text-xs flex-1 min-w-0">
                        <div className="text-white font-medium truncate">
                          {bubble.text || `气泡 ${index + 1}`}
                        </div>
                        <div className="text-gray-500">{preset.label}</div>
                      </div>
                    </div>

                    {/* 层级控制按钮 */}
                    {onMoveLayer && isSelected && (
                      <div className="flex items-center gap-0.5 mr-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveLayer(bubble.id, "top");
                          }}
                          className="h-6 w-6 p-0"
                          title="置顶"
                        >
                          <ChevronsUp className="w-3 h-3 text-gray-400 hover:text-orange-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveLayer(bubble.id, "up");
                          }}
                          className="h-6 w-6 p-0"
                          title="上移一层"
                        >
                          <ArrowUp className="w-3 h-3 text-gray-400 hover:text-orange-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveLayer(bubble.id, "down");
                          }}
                          className="h-6 w-6 p-0"
                          title="下移一层"
                        >
                          <ArrowDown className="w-3 h-3 text-gray-400 hover:text-orange-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveLayer(bubble.id, "bottom");
                          }}
                          className="h-6 w-6 p-0"
                          title="置底"
                        >
                          <ChevronsDown className="w-3 h-3 text-gray-400 hover:text-orange-400" />
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBubble(bubble.id);
                      }}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-400 hover:text-red-300" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
