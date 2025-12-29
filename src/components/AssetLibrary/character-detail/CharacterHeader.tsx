import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Palette, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { CharacterAsset, ComicStyle } from "./types";
import type { UsageSummary } from "@/hooks/use-usage";

interface CharacterHeaderProps {
  character: CharacterAsset;
  onBack: () => void;
  onUpdate?: (character: CharacterAsset) => void;
  onGenerateSimilar: () => void;
  usage: UsageSummary | null;
  usageLoading: boolean;
}

const CharacterHeader = ({
  character,
  onBack,
  onUpdate,
  onGenerateSimilar,
  usage,
  usageLoading,
}: CharacterHeaderProps) => {
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(character.comic_style?.id || "__none__");
  const [isStyleSaving, setIsStyleSaving] = useState(false);
  const { toast } = useToast();

  // Fetch comic styles
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const response = await fetch("/api/comic-styles");
        if (response.ok) {
          const data = await response.json();
          setStyles(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching comic styles:", error);
      }
    };

    fetchStyles();
  }, []);

  // Handle comic style save
  const handleSaveStyle = async () => {
    setIsStyleSaving(true);
    try {
      const response = await fetch(`/api/character/${character.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comic_style_id: selectedStyleId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "保存失败");
      }

      const data = await response.json();

      toast({
        title: "风格保存成功",
        description: selectedStyleId ? "漫画风格已更新" : "已移除漫画风格",
      });

      // Update parent component
      if (onUpdate && data.character) {
        onUpdate(data.character);
      }
    } catch (error) {
      console.error("Save style error:", error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsStyleSaving(false);
    }
  };

  const renderUsageBadge = (
    label: string,
    item?: { remaining: number | null; limit: number | null; count: number }
  ) => {
    const remaining = item?.remaining ?? null;
    const limit = item?.limit ?? null;
    const isLow = typeof remaining === "number" && remaining <= 3;
    const isExhausted = typeof remaining === "number" && remaining <= 0;
    const badgeClass = isExhausted
      ? "border-red-500/70 bg-red-500/10 text-red-600 dark:text-red-400"
      : isLow
      ? "border-yellow-500/60 bg-yellow-500/10"
      : "border-border";

    return (
      <div className={`rounded-lg border px-3 py-2 text-sm ${badgeClass}`}>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">
          {usageLoading
            ? "加载中..."
            : limit
            ? `剩余 ${remaining ?? "-"} / ${limit}`
            : "无限制"}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回角色列表
        </button>
        <Button
          variant="outline"
          onClick={onGenerateSimilar}
        >
          <Copy className="w-4 h-4 mr-2" />
          生成相似角色
        </Button>
      </div>

      {/* Usage Badges */}
      <div className="flex flex-wrap gap-3">
        <div className="text-sm text-muted-foreground">今日用量</div>
        {renderUsageBadge("图像生成", usage?.image_generation)}
        {renderUsageBadge("分镜生成", usage?.storyboard_generation)}
        {renderUsageBadge("聊天/LLM", usage?.llm_chat)}
      </div>

      {/* Character Info */}
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-border">
          {character.base_image_url ? (
            <img src={character.base_image_url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-4xl">👤</span>
            </div>
          )}
        </div>
        <div>
          <h2 className="font-comic text-3xl text-foreground">{character.name}</h2>
          <p className="text-muted-foreground">{character.description || "暂无描述"}</p>

          {/* Comic Style Display and Edit */}
          <div className="mt-3 space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4" />
              漫画风格
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedStyleId}
                onValueChange={setSelectedStyleId}
                disabled={isStyleSaving}
              >
                <SelectTrigger className="w-[250px] h-9">
                  <SelectValue placeholder="选择漫画风格（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无风格</SelectItem>
                  {styles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      <div className="flex items-center gap-2">
                        {style.image_url && (
                          <img
                            src={style.image_url}
                            alt={style.name_zh}
                            className="w-4 h-4 rounded object-cover"
                          />
                        )}
                        <span>{style.name_zh}</span>
                        <span className="text-xs text-muted-foreground">({style.name_en})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStyleId !== (character.comic_style?.id || "__none__") && (
                <Button
                  size="sm"
                  onClick={handleSaveStyle}
                  disabled={isStyleSaving}
                >
                  {isStyleSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1" />
                      保存
                    </>
                  )}
                </Button>
              )}
              {character.comic_style && (
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-semibold",
                  character.comic_style.tag_color
                )}>
                  当前: {character.comic_style.name_en}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {character.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default CharacterHeader;
