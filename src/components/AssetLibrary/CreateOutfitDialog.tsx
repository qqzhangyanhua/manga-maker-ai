import { useState } from "react";
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
import { Shirt, Loader2 } from "lucide-react";

interface CreateOutfitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    outfit_name: string;
    outfit_type: string;
    description?: string;
  }) => Promise<void>;
}

const outfitTypes = [
  { value: "school", label: "校服", icon: "🎓" },
  { value: "battle", label: "战斗服", icon: "⚔️" },
  { value: "casual", label: "休闲装", icon: "👕" },
  { value: "formal", label: "正装", icon: "👔" },
  { value: "sleepwear", label: "睡衣", icon: "🌙" },
  { value: "sports", label: "运动装", icon: "⚽" },
  { value: "custom", label: "自定义", icon: "✨" },
];

const CreateOutfitDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: CreateOutfitDialogProps) => {
  const [outfitName, setOutfitName] = useState("");
  const [outfitType, setOutfitType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!outfitName.trim()) {
      setError("服装名称不能为空");
      return;
    }

    if (!outfitType) {
      setError("请选择服装类型");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        outfit_name: outfitName.trim(),
        outfit_type: outfitType,
        description: description.trim(),
      });
      // Reset form
      setOutfitName("");
      setOutfitType("");
      setDescription("");
      onOpenChange(false);
    } catch (err) {
      setError("创建失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setOutfitName("");
      setOutfitType("");
      setDescription("");
      setError("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-comic">
            <Shirt className="w-6 h-6 text-primary" />
            添加新服装
          </DialogTitle>
          <DialogDescription>
            为角色创建新的服装配置，支持多套造型切换
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="outfit-type" className="text-base font-semibold">
              服装类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={outfitType} onValueChange={setOutfitType} disabled={isSubmitting}>
              <SelectTrigger id="outfit-type" className="h-11">
                <SelectValue placeholder="选择服装类型" />
              </SelectTrigger>
              <SelectContent>
                {outfitTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outfit-name" className="text-base font-semibold">
              服装名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="outfit-name"
              placeholder="例如：夏季校服、战斗铠甲、日常便装..."
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              disabled={isSubmitting}
              className="h-11"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {outfitName.length}/50 字符
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outfit-description" className="text-base font-semibold">
              服装描述
            </Label>
            <Textarea
              id="outfit-description"
              placeholder="描述服装的款式、颜色、材质、配饰...&#10;例如：白色水手服，深蓝色蝴蝶结，格子裙，黑色长筒袜"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[100px] resize-none"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/300 字符 · 详细的描述有助于生成更准确的服装
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
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
              disabled={isSubmitting || !outfitName.trim() || !outfitType}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Shirt className="w-4 h-4" />
                  创建服装
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOutfitDialog;
