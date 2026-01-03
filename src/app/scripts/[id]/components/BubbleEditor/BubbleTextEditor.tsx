/**
 * 气泡文字编辑器组件
 */

"use client";

import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Type } from "lucide-react";
import { SpeechBubble } from "./types";

export interface BubbleTextEditorProps {
  bubble: SpeechBubble;
  onUpdate: (updates: Partial<SpeechBubble>) => void;
  autoFocus?: boolean; // 新增：自动聚焦到文本框
}

export function BubbleTextEditor({ bubble, onUpdate, autoFocus = false }: BubbleTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦到文本框
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [autoFocus, bubble.id]);

  const handleStyleUpdate = (styleUpdates: Partial<SpeechBubble["style"]>) => {
    onUpdate({
      style: {
        ...bubble.style,
        ...styleUpdates,
      },
    });
  };

  return (
    <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
        <Type className="w-4 h-4" />
        编辑文字
      </h3>

      <div className="space-y-3">
        {/* 文字内容 */}
        <div>
          <Label className="text-gray-400 text-xs">文字内容</Label>
          <Textarea
            value={bubble.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="输入对话内容..."
            className="mt-1 bg-gray-900/50 border-gray-700 min-h-[60px] text-sm"
          />
        </div>

        {/* 字体和字号 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-gray-400 text-xs">字体</Label>
            <Select
              value={bubble.style.fontFamily}
              onValueChange={(value) => handleStyleUpdate({ fontFamily: value })}
            >
              <SelectTrigger className="mt-1 h-8 text-xs bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Microsoft YaHei">微软雅黑</SelectItem>
                <SelectItem value="SimHei">黑体</SelectItem>
                <SelectItem value="KaiTi">楷体</SelectItem>
                <SelectItem value="Arial Black">Arial Black</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">字号</Label>
            <Input
              type="number"
              value={bubble.style.fontSize}
              onChange={(e) =>
                handleStyleUpdate({ fontSize: Number(e.target.value) })
              }
              min={8}
              max={48}
              className="mt-1 h-8 text-xs bg-gray-900/50 border-gray-700"
            />
          </div>
        </div>

        {/* 字重和样式 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-gray-400 text-xs">字重</Label>
            <Select
              value={bubble.style.fontWeight}
              onValueChange={(value: "normal" | "bold") =>
                handleStyleUpdate({ fontWeight: value })
              }
            >
              <SelectTrigger className="mt-1 h-8 text-xs bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="bold">加粗</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">样式</Label>
            <Select
              value={bubble.style.fontStyle || "normal"}
              onValueChange={(value: "normal" | "italic") =>
                handleStyleUpdate({ fontStyle: value })
              }
            >
              <SelectTrigger className="mt-1 h-8 text-xs bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="italic">斜体</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 颜色选择 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-gray-400 text-xs">文字颜色</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="color"
                value={bubble.style.color}
                onChange={(e) => handleStyleUpdate({ color: e.target.value })}
                className="h-8 w-12 p-1 bg-gray-900/50 border-gray-700"
              />
              <Input
                type="text"
                value={bubble.style.color}
                onChange={(e) => handleStyleUpdate({ color: e.target.value })}
                className="h-8 flex-1 text-xs bg-gray-900/50 border-gray-700"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-400 text-xs">气泡颜色</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="color"
                value={bubble.style.backgroundColor || "#FFFFFF"}
                onChange={(e) =>
                  handleStyleUpdate({ backgroundColor: e.target.value })
                }
                className="h-8 w-12 p-1 bg-gray-900/50 border-gray-700"
              />
              <Input
                type="text"
                value={bubble.style.backgroundColor || "#FFFFFF"}
                onChange={(e) =>
                  handleStyleUpdate({ backgroundColor: e.target.value })
                }
                className="h-8 flex-1 text-xs bg-gray-900/50 border-gray-700"
              />
            </div>
          </div>
        </div>

        {/* 边框设置 */}
        {bubble.style.borderColor && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-400 text-xs">边框颜色</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="color"
                  value={bubble.style.borderColor || "#000000"}
                  onChange={(e) =>
                    handleStyleUpdate({ borderColor: e.target.value })
                  }
                  className="h-8 w-12 p-1 bg-gray-900/50 border-gray-700"
                />
                <Input
                  type="text"
                  value={bubble.style.borderColor || "#000000"}
                  onChange={(e) =>
                    handleStyleUpdate({ borderColor: e.target.value })
                  }
                  className="h-8 flex-1 text-xs bg-gray-900/50 border-gray-700"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs">边框宽度</Label>
              <Input
                type="number"
                value={bubble.style.borderWidth || 2}
                onChange={(e) =>
                  handleStyleUpdate({ borderWidth: Number(e.target.value) })
                }
                min={0}
                max={10}
                className="mt-1 h-8 text-xs bg-gray-900/50 border-gray-700"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
