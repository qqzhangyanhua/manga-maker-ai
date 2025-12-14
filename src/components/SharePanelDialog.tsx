"use client";

import { useState } from "react";
import { Share2, Loader2, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface SharePanelDialogProps {
  panelId: string;
  isShared: boolean;
  showPrompt: boolean;
  onShareSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function SharePanelDialog({
  panelId,
  isShared: initialIsShared,
  showPrompt: initialShowPrompt,
  onShareSuccess,
  trigger,
}: SharePanelDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [isShared, setIsShared] = useState(initialIsShared);
  const [showPrompt, setShowPrompt] = useState(initialShowPrompt);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/panel/${panelId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_prompt: showPrompt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "分享失败");
      }

      setIsShared(true);
      toast({
        title: "分享成功",
        description: "作品已发布到画廊",
      });

      onShareSuccess?.();
      setOpen(false);
    } catch (error) {
      toast({
        title: "分享失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/panel/${panelId}/share`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "取消分享失败");
      }

      setIsShared(false);
      toast({
        title: "取消分享成功",
        description: "作品已从画廊移除",
      });

      onShareSuccess?.();
      setOpen(false);
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const galleryUrl = `${window.location.origin}/gallery/${panelId}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger || (
        <Button
          variant={isShared ? "default" : "outline"}
          size="sm"
          onClick={() => setOpen(true)}
        >
          {isShared ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              已分享
            </>
          ) : (
            <>
              <Share2 className="mr-1 h-3 w-3" />
              分享
            </>
          )}
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isShared ? "管理分享" : "分享到画廊"}
          </DialogTitle>
          <DialogDescription>
            {isShared
              ? "作品已发布到公开画廊，其他用户可以浏览"
              : "将这个精彩的作品分享到画廊，让更多人看到"}
          </DialogDescription>
        </DialogHeader>

        {isShared ? (
          <div className="space-y-4">
            {/* 画廊链接 */}
            <div className="rounded-lg border bg-muted p-3">
              <p className="mb-2 text-xs text-muted-foreground">画廊链接</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={galleryUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(galleryUrl);
                    toast({ title: "已复制链接" });
                  }}
                >
                  复制
                </Button>
              </div>
            </div>

            {/* 在新窗口打开 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(galleryUrl, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              在画廊中查看
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Prompt 可见性设置 */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="show-prompt" className="text-sm font-medium">
                  公开生成提示词
                </Label>
                <p className="text-xs text-muted-foreground">
                  允许其他用户看到这张图的 Prompt
                </p>
              </div>
              <Switch
                id="show-prompt"
                checked={showPrompt}
                onCheckedChange={setShowPrompt}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              分享后，作品将出现在公开画廊中，任何人都可以浏览。
            </p>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isShared ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                关闭
              </Button>
              <Button
                variant="destructive"
                onClick={handleUnshare}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                取消分享
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                取消
              </Button>
              <Button
                onClick={handleShare}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Share2 className="mr-2 h-4 w-4" />
                发布到画廊
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
