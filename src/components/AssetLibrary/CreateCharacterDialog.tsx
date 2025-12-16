import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Palette } from "lucide-react";
import ImageUpload from "./ImageUpload";
import { useToast } from "@/hooks/use-toast";
import type { CharacterAsset, ComicStyle } from "./CharacterLibrary";

interface CreateCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (character: CharacterAsset) => Promise<void>;
}

const CreateCharacterDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: CreateCharacterDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Comic style selection
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("__none__");
  const [stylesLoading, setStylesLoading] = useState(false);

  // Fetch comic styles when dialog opens
  useEffect(() => {
    if (open) {
      const fetchStyles = async () => {
        setStylesLoading(true);
        try {
          const response = await fetch("/api/comic-styles");
          if (response.ok) {
            const data = await response.json();
            setStyles(data.data || []);
          }
        } catch (error) {
          console.error("Error fetching comic styles:", error);
        } finally {
          setStylesLoading(false);
        }
      };

      fetchStyles();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("角色名称不能为空");
      return;
    }

    setIsSubmitting(true);

    try {
      // 准备表单数据
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("tags", JSON.stringify([]));

      // Add comic style if selected
      if (selectedStyleId && selectedStyleId !== "__none__") {
        formData.append("comic_style_id", selectedStyleId);
      }

      // 添加所有图片文件
      if (imageFiles.length > 0) {
        setUploadProgress(`正在创建角色并上传 ${imageFiles.length} 张图片...`);
        imageFiles.forEach((file, index) => {
          formData.append(`images[${index}]`, file);
        });
      } else {
        setUploadProgress("正在创建角色...");
      }

      // 一次性提交到后端
      const response = await fetch("/api/character", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "创建角色失败");
      }

      const result = await response.json();
      if (!result?.character) {
        throw new Error("创建角色返回数据异常");
      }

      // 通知父组件刷新列表（避免重复请求）
      await onSubmit(result.character as CharacterAsset);

      // Reset form
      setName("");
      setDescription("");
      setImageFiles([]);
      setSelectedStyleId("__none__");
      setUploadProgress("");
      onOpenChange(false);

      toast({
        title: "角色创建成功",
        description: result.message || `${result.character.name} 已创建`,
      });
    } catch (err) {
      console.error("Create character error:", err);
      setError(err instanceof Error ? err.message : "创建失败，请重试");
      toast({
        title: "创建失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName("");
      setDescription("");
      setImageFiles([]);
      setSelectedStyleId("__none__");
      setUploadProgress("");
      setError("");
      onOpenChange(false);
    }
  };

  const handleImageUpload = (files: File[]) => {
    setImageFiles(files);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-comic">
            <Sparkles className="w-6 h-6 text-primary" />
            创建新角色
          </DialogTitle>
          <DialogDescription>
            打造你的"数字演员"，开始你的创作之旅
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* 图片上传区域 */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              角色参考图
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              上传角色参考图用于训练 LoRA 模型（可选，第一张将作为基础形象）
            </p>
            <ImageUpload
              onUpload={handleImageUpload}
              maxFiles={5}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-semibold">
              角色名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="例如：赛博朋克少女、幻想战士..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="h-11"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/50 字符
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              角色描述
            </Label>
            <Textarea
              id="description"
              placeholder="描述角色的外观、性格、特征...&#10;例如：蓝色双马尾，赛博朋克风格，自信的眼神，科技感十足的装备"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[120px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 字符 · 详细的描述有助于生成更准确的角色
            </p>
          </div>

          {/* Comic Style Selection */}
          <div className="space-y-2">
            <Label htmlFor="comic-style" className="text-base font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4" />
              漫画风格
            </Label>
            <Select
              value={selectedStyleId}
              onValueChange={setSelectedStyleId}
              disabled={isSubmitting || stylesLoading}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={stylesLoading ? "加载中..." : "选择漫画风格（可选）"} />
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
                          className="w-5 h-5 rounded object-cover"
                        />
                      )}
                      <span>{style.name_zh}</span>
                      <span className="text-xs text-muted-foreground">({style.name_en})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              选择一个漫画风格可以让角色保持统一的美术风格
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
            </div>
          )}

          {uploadProgress && (
            <div className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadProgress}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="comic"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  创建角色
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCharacterDialog;
