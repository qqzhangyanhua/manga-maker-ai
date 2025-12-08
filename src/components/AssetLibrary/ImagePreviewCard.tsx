import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Upload, MoreVertical, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePreviewCardProps {
  imageUrl?: string | null;
  label: string;
  aspectRatio?: "square" | "portrait" | "landscape";
  isGenerating?: boolean;
  onGenerate?: () => void;
  onUpload?: () => void;
  onRegenerate?: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
  showGenerateButton?: boolean;
  showUploadButton?: boolean;
  className?: string;
}

const ImagePreviewCard = ({
  imageUrl,
  label,
  aspectRatio = "portrait",
  isGenerating = false,
  onGenerate,
  onUpload,
  onRegenerate,
  onReplace,
  onDelete,
  showGenerateButton = true,
  showUploadButton = true,
  className,
}: ImagePreviewCardProps) => {
  const [imageError, setImageError] = useState(false);

  const aspectRatioClasses = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    landscape: "aspect-[4/3]",
  };

  const hasImage = imageUrl && !imageError;

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 overflow-hidden transition-all",
        aspectRatioClasses[aspectRatio],
        hasImage ? "border-primary bg-card" : "border-dashed border-border bg-muted/50",
        className
      )}
    >
      {/* 加载状态 */}
      {isGenerating && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">生成中...</span>
        </div>
      )}

      {/* 已有图片 */}
      {hasImage ? (
        <>
          <img
            src={imageUrl}
            alt={label}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />

          {/* 标签 */}
          <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm py-1.5 px-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{label}</span>

            {/* 操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={isGenerating}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRegenerate && showGenerateButton && (
                  <DropdownMenuItem onClick={onRegenerate}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重新生成
                  </DropdownMenuItem>
                )}
                {onReplace && showUploadButton && (
                  <DropdownMenuItem onClick={onReplace}>
                    <Upload className="w-4 h-4 mr-2" />
                    替换图片
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ) : (
        // 空白状态
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <RotateCcw className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground text-center">{label}</span>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-2 w-full max-w-[140px]">
            {showGenerateButton && onGenerate && (
              <Button
                size="sm"
                variant="outline"
                onClick={onGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI 生成
              </Button>
            )}
            {showUploadButton && onUpload && (
              <Button
                size="sm"
                variant="outline"
                onClick={onUpload}
                disabled={isGenerating}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                上传图片
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePreviewCard;
