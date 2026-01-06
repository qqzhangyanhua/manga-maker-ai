/**
 * 生成章节背景对话框
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GenerateBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterTitle?: string;
  storyStyle?: string; // 当前故事/项目使用的风格
  onConfirm: (params: GenerateBackgroundParams) => Promise<void>;
}

export interface GenerateBackgroundParams {
  scene_type: string;
  style: string;
  prompt?: string;
  negative_prompt?: string;
}

interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  prompt_prefix: string | null;
  description: string | null;
}

const SCENE_TYPES = [
  { value: "outdoor", label: "户外场景" },
  { value: "indoor", label: "室内场景" },
  { value: "urban", label: "城市街道" },
  { value: "nature", label: "自然风光" },
  { value: "fantasy", label: "奇幻场景" },
  { value: "scifi", label: "科幻场景" },
  { value: "historical", label: "历史场景" },
  { value: "abstract", label: "抽象背景" },
];

export function GenerateBackgroundDialog({
  open,
  onOpenChange,
  chapterTitle,
  storyStyle,
  onConfirm,
}: GenerateBackgroundDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [sceneType, setSceneType] = useState("outdoor");
  const [style, setStyle] = useState(storyStyle || "manga style");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "people, humans, characters, text, watermark, low quality, blurry"
  );

  // 漫画风格列表
  const [comicStyles, setComicStyles] = useState<ComicStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);

  // 当对话框打开时，获取漫画风格列表
  useEffect(() => {
    if (open) {
      fetchComicStyles();
      // 重置风格为当前故事的风格
      if (storyStyle) {
        setStyle(storyStyle);
      }
    }
  }, [open, storyStyle]);

  const fetchComicStyles = async () => {
    setIsLoadingStyles(true);
    try {
      const response = await fetch("/api/comic-styles?enabled=true");
      const data = await response.json();
      if (data.data) {
        setComicStyles(data.data);
      }
    } catch (error) {
      console.error("获取漫画风格失败:", error);
    } finally {
      setIsLoadingStyles(false);
    }
  };

  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      await onConfirm({
        scene_type: sceneType,
        style,
        prompt: prompt.trim() || undefined,
        negative_prompt: negativePrompt.trim() || undefined,
      });
      // 成功后关闭对话框
      onOpenChange(false);
      // 重置表单
      setPrompt("");
      setSceneType("outdoor");
      setStyle(storyStyle || "manga style");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>生成章节背景图</DialogTitle>
          {chapterTitle && (
            <DialogDescription>
              为 <span className="font-semibold text-white">{chapterTitle}</span> 生成背景图
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 场景类型选择 */}
          <div className="space-y-2">
            <Label htmlFor="scene-type">场景类型</Label>
            <Select value={sceneType} onValueChange={setSceneType}>
              <SelectTrigger id="scene-type">
                <SelectValue placeholder="选择场景类型" />
              </SelectTrigger>
              <SelectContent>
                {SCENE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 风格选择 - 从API获取 */}
          <div className="space-y-2">
            <Label htmlFor="style">
              画面风格
              {storyStyle && (
                <span className="ml-2 text-xs text-blue-400">
                  (已自动选择当前故事风格)
                </span>
              )}
            </Label>
            <Select value={style} onValueChange={setStyle} disabled={isLoadingStyles}>
              <SelectTrigger id="style">
                <SelectValue placeholder={isLoadingStyles ? "加载中..." : "选择画面风格"} />
              </SelectTrigger>
              <SelectContent>
                {comicStyles.length > 0 ? (
                  comicStyles.map((s) => (
                    <SelectItem key={s.id} value={s.prompt_prefix || s.name_en}>
                      {s.name_zh}
                      {s.description && (
                        <span className="text-xs text-gray-400 ml-2">
                          {s.description}
                        </span>
                      )}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="manga style">漫画风格</SelectItem>
                )}
              </SelectContent>
            </Select>
            {isLoadingStyles && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                正在加载风格列表...
              </p>
            )}
          </div>

          {/* 自定义提示词 */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              自定义提示词 <span className="text-xs text-gray-400">(可选)</span>
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：夕阳下的校园操场，樱花飘落，温暖的橙色光线..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              留空则自动根据章节信息生成提示词
            </p>
          </div>

          {/* 负面提示词 */}
          <div className="space-y-2">
            <Label htmlFor="negative-prompt">
              负面提示词 <span className="text-xs text-gray-400">(可选)</span>
            </Label>
            <Textarea
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="例如：人物、角色、文字、水印、低质量、模糊..."
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              用于排除不希望出现的元素
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              "开始生成"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
