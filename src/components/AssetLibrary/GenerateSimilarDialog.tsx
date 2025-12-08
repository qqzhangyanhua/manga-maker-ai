import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, Save, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GeneratedImage {
  image_url: string;
  optimized_prompt: string;
}

interface GenerateSimilarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: {
    id: string;
    name: string;
    description: string | null;
    tags: string[];
  };
  onSuccess: () => void;
}

const GenerateSimilarDialog = ({
  open,
  onOpenChange,
  character,
  onSuccess,
}: GenerateSimilarDialogProps) => {
  const [variationPrompt, setVariationPrompt] = useState("");
  const [count, setCount] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!variationPrompt.trim()) {
      toast({
        title: "请输入变化描述",
        description: "描述你想要的变化，如：把头发改成银色",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);
    setSelectedIndices(new Set());

    try {
      const response = await fetch("/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: character.id,
          variation_prompt: variationPrompt,
          count: count,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImages(data.generated_images);
        toast({
          title: "生成成功",
          description: `已生成 ${data.generated_images.length} 个角色变体`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "生成失败");
      }
    } catch (error) {
      console.error("Generate similar character error:", error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSaveSelected = async () => {
    if (selectedIndices.size === 0) {
      toast({
        title: "请选择图片",
        description: "请至少选择一张图片保存到角色库",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const selectedImages = Array.from(selectedIndices).map((index) => generatedImages[index]);

      let savedCount = 0;
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        
        const response = await fetch("/api/character", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${character.name} (变体${i + 1})`,
            description: `${character.description || ""}\n\n【变化】：${variationPrompt}`,
            base_image_url: img.image_url,
            tags: [...character.tags, "AI生成", "相似角色"],
          }),
        });

        if (response.ok) {
          savedCount++;
        } else {
          console.error(`保存第 ${i + 1} 个角色失败`);
        }
      }

      toast({
        title: "保存成功",
        description: `已保存 ${savedCount} 个角色到角色库`,
      });

      // 重置状态
      setVariationPrompt("");
      setCount(1);
      setGeneratedImages([]);
      setSelectedIndices(new Set());
      
      // 关闭对话框并触发刷新
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Save characters error:", error);
      toast({
        title: "保存失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating && !isSaving) {
      setVariationPrompt("");
      setCount(1);
      setGeneratedImages([]);
      setSelectedIndices(new Set());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            生成相似角色
          </DialogTitle>
          <DialogDescription>
            基于 <span className="font-semibold text-foreground">{character.name}</span> 生成角色变体
          </DialogDescription>
        </DialogHeader>

        {/* Input Section */}
        <div className="space-y-4 py-4">
          {/* Variation Prompt */}
          <div className="space-y-2">
            <Label htmlFor="variation-prompt">变化描述 *</Label>
            <Textarea
              id="variation-prompt"
              placeholder="描述你想要的变化，如：&#10;• 把头发改成银色，眼睛改成蓝色&#10;• 年龄设定为少年，身材更瘦小&#10;• 服装改成现代校服风格"
              value={variationPrompt}
              onChange={(e) => setVariationPrompt(e.target.value)}
              disabled={isGenerating || isSaving}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Count Selection */}
          <div className="space-y-2">
            <Label>生成数量</Label>
            <RadioGroup
              value={String(count)}
              onValueChange={(value) => setCount(Number(value) as 1 | 2 | 3)}
              disabled={isGenerating || isSaving}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="count-1" />
                <Label htmlFor="count-1" className="cursor-pointer">1 张</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="count-2" />
                <Label htmlFor="count-2" className="cursor-pointer">2 张</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="count-3" />
                <Label htmlFor="count-3" className="cursor-pointer">3 张</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isSaving || !variationPrompt.trim()}
            className="w-full"
            variant="comic"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                生成中...（约 {count * 10} 秒）
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                开始生成
              </>
            )}
          </Button>
        </div>

        {/* Results Section */}
        {generatedImages.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">生成结果</Label>
              <span className="text-sm text-muted-foreground">
                已选择 {selectedIndices.size} / {generatedImages.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generatedImages.map((img, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative group border-2 rounded-lg overflow-hidden transition-all cursor-pointer",
                    selectedIndices.has(index)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => toggleSelection(index)}
                >
                  {/* Image */}
                  <div className="aspect-[3/4] relative bg-muted">
                    {img.image_url.startsWith("data:image") || img.image_url.startsWith("http") ? (
                      <img
                        src={img.image_url}
                        alt={`变体 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Checkbox Overlay */}
                    <div className="absolute top-2 right-2">
                      <div
                        className={cn(
                          "w-6 h-6 rounded border-2 flex items-center justify-center transition-all",
                          selectedIndices.has(index)
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        )}
                      >
                        {selectedIndices.has(index) && (
                          <svg
                            className="w-4 h-4 text-primary-foreground"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Image Number */}
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-background/80 text-xs font-semibold">
                      变体 {index + 1}
                    </div>
                  </div>

                  {/* Prompt Preview (Optional) */}
                  <div className="p-2 bg-muted/50 text-xs text-muted-foreground line-clamp-2">
                    {img.optimized_prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating || isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          {generatedImages.length > 0 && (
            <Button
              onClick={handleSaveSelected}
              disabled={isSaving || selectedIndices.size === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存选中的角色 ({selectedIndices.size})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateSimilarDialog;
