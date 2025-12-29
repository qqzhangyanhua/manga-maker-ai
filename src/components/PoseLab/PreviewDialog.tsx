import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { GeneratedImage } from "./types";

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedImage: GeneratedImage | null;
  onClear: () => void;
}

/**
 * Dialog for previewing generated pose variant image
 */
export function PreviewDialog({
  open,
  onOpenChange,
  generatedImage,
  onClear,
}: PreviewDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    onClear();
  };

  const handleViewFullSize = () => {
    if (generatedImage?.url) {
      window.open(generatedImage.url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>姿势变体生成成功</DialogTitle>
          <DialogDescription>
            {generatedImage?.poseName} - {generatedImage?.poseDescription}
          </DialogDescription>
        </DialogHeader>

        {generatedImage && (
          <div className="space-y-4">
            {/* 图片预览 */}
            <div className="aspect-[3/4] relative bg-muted rounded-lg overflow-hidden">
              <img
                src={generatedImage.url}
                alt={generatedImage.poseName}
                className="w-full h-full object-contain"
              />
            </div>

            {/* 提示信息 */}
            <div className="text-sm text-muted-foreground text-center">
              已保存到角色的"姿势变体"库中,可在角色详情页面查看管理
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>
                关闭
              </Button>
              <Button onClick={handleViewFullSize}>
                <Sparkles className="w-4 h-4 mr-2" />
                查看大图
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
