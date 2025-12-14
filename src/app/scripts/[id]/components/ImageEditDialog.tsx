import { useState, useEffect } from "react";
import { Wand2, Copy, Paintbrush, Palette, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type EditType = "regenerate" | "variant" | "inpaint" | "style_transfer";

type ImageEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: {
    id: string;
    image_url: string;
    prompt: string;
    style: string | null;
  } | null;
  onEditSubmit: (imageId: string, editData: EditData) => Promise<void>;
};

type EditData = {
  editType: EditType;
  prompt?: string;
  style?: string;
  variantCount?: number;
  variantType?: "style" | "angle" | "composition";
  targetStyle?: string;
  strength?: number;
  providerType?: string;
};


export function ImageEditDialog({
  open,
  onOpenChange,
  image,
  onEditSubmit,
}: ImageEditDialogProps) {
  const [editType, setEditType] = useState<EditType>("regenerate");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [variantCount, setVariantCount] = useState(3);
  const [variantType, setVariantType] = useState<"style" | "angle" | "composition">("style");
  const [targetStyle, setTargetStyle] = useState("");
  const [strength, setStrength] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when image changes
  useEffect(() => {
    if (image) {
      setPrompt(image.prompt);
      setStyle(image.style || "");
    }
  }, [image]);

  async function handleSubmit() {
    if (!image) return;

    setIsSubmitting(true);
    try {
      const editData: EditData = {
        editType,
        prompt: prompt || undefined,
        style: style || undefined,
        providerType: "image_edit",
      };

      if (editType === "variant") {
        editData.variantCount = variantCount;
        editData.variantType = variantType;
      } else if (editType === "style_transfer") {
        editData.targetStyle = targetStyle;
        editData.strength = strength;
      }

      await onEditSubmit(image.id, editData);
      onOpenChange(false);
    } catch (error) {
      console.error("Edit submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI 图片编辑</DialogTitle>
          <DialogDescription>
            选择编辑方式并调整参数，生成新的图片
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Original Image */}
          <div className="space-y-4">
            <div className="text-sm font-medium">原始图片</div>
            <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
              <img
                src={image.image_url}
                alt={image.prompt}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">原始提示词</div>
              <p className="text-sm">{image.prompt}</p>
            </div>
          </div>

          {/* Right: Edit Options */}
          <div className="space-y-4">
            <Tabs value={editType} onValueChange={(v) => setEditType(v as EditType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="regenerate">
                  <Wand2 className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="variant">
                  <Copy className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="inpaint">
                  <Paintbrush className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="style_transfer">
                  <Palette className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="regenerate" className="space-y-4">
                <div className="space-y-2">
                  <Label>修改提示词</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="输入新的提示词..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>风格</Label>
                  <Input
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="例如: manga style, anime style..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="variant" className="space-y-4">
                <div className="space-y-2">
                  <Label>变体数量</Label>
                  <Select
                    value={variantCount.toString()}
                    onValueChange={(v) => setVariantCount(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 个</SelectItem>
                      <SelectItem value="2">2 个</SelectItem>
                      <SelectItem value="3">3 个</SelectItem>
                      <SelectItem value="4">4 个</SelectItem>
                      <SelectItem value="5">5 个</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>变体类型</Label>
                  <Select
                    value={variantType}
                    onValueChange={(v) => setVariantType(v as "style" | "angle" | "composition")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="style">风格变化</SelectItem>
                      <SelectItem value="angle">视角变化</SelectItem>
                      <SelectItem value="composition">构图变化</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  基于原图生成多个风格相似但细节不同的变体
                </div>
              </TabsContent>

              <TabsContent value="inpaint" className="space-y-4">
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                  <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">局部编辑功能开发中</p>
                  <p className="text-xs mt-1">
                    将支持涂抹选区并重新生成该区域
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="style_transfer" className="space-y-4">
                <div className="space-y-2">
                  <Label>目标风格</Label>
                  <Input
                    value={targetStyle}
                    onChange={(e) => setTargetStyle(e.target.value)}
                    placeholder="例如: watercolor, oil painting, sketch..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>迁移强度: {strength}%</Label>
                  <Slider
                    value={[strength]}
                    onValueChange={(v) => setStrength(v[0])}
                    min={10}
                    max={100}
                    step={10}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  保持图片内容，改变艺术风格
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (editType === "inpaint")}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "开始生成"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
