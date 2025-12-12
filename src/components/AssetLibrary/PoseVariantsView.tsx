import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PoseVariant {
  id: string;
  image_url: string;
  pose_name: string;
  pose_description: string;
  created_at: string;
}

interface PoseVariantsViewProps {
  character: {
    id: string;
    name: string;
  };
}

const PoseVariantsView = ({ character }: PoseVariantsViewProps) => {
  const [variants, setVariants] = useState<PoseVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<PoseVariant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // 加载姿势变体
  useEffect(() => {
    const loadVariants = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/character/${character.id}/pose-variants`);
        if (!response.ok) {
          throw new Error("加载姿势变体失败");
        }
        const data = await response.json();
        setVariants(data.variants || []);
      } catch (error) {
        console.error("Failed to load pose variants:", error);
        toast({
          variant: "destructive",
          title: "加载失败",
          description: error instanceof Error ? error.message : "无法加载姿势变体",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadVariants();
  }, [character.id, toast]);

  const handleDeleteClick = (variant: PoseVariant) => {
    setVariantToDelete(variant);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!variantToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/character/${character.id}/pose-variants?variant_id=${variantToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setVariants((prev) => prev.filter((v) => v.id !== variantToDelete.id));
        toast({
          title: "删除成功",
          description: "姿势变体已删除",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除失败");
      }
    } catch (error) {
      console.error("Delete variant error:", error);
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后重试",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setVariantToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="comic-card p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>加载姿势变体中...</p>
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="comic-card p-12">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">还没有姿势变体</p>
          <p className="text-sm">
            前往"姿势"标签，使用 3D 姿态编辑器创建不同姿势的角色图片
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="comic-card p-6">
        <div className="mb-4">
          <h3 className="font-comic text-xl text-foreground">姿势变体库</h3>
          <p className="text-sm text-muted-foreground">
            通过 3D 姿态编辑器生成的角色姿势图片，不会覆盖标准三视图
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className="comic-card border-2 border-border overflow-hidden hover:border-primary transition-colors"
            >
              {/* 图片 */}
              <div className="aspect-[3/4] relative bg-muted overflow-hidden">
                <img
                  src={variant.image_url}
                  alt={variant.pose_name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 信息 */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {variant.pose_name}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {variant.pose_description}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground">
                  生成于 {formatDate(variant.created_at)}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(variant.image_url, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    查看大图
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClick(variant)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除姿势变体"{variantToDelete?.pose_name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PoseVariantsView;
