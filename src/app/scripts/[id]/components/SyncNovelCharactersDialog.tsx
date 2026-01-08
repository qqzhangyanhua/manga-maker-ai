"use client";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SuggestedCharacter {
  name: string;
  role: string; // 改为 string 以接受任意角色类型
  description: string;
  appearance: string;
  generated?: boolean;
}

interface SyncNovelCharactersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  suggestedCharacters: SuggestedCharacter[];
  onSuccess: () => void;
}

const roleLabels: Record<string, string> = {
  protagonist: "主角",
  antagonist: "反派",
  supporting: "配角",
  minor: "龙套",
};

const roleColors: Record<string, string> = {
  protagonist: "bg-orange-500",
  antagonist: "bg-red-500",
  supporting: "bg-blue-500",
  minor: "bg-gray-500",
};

export function SyncNovelCharactersDialog({
  open,
  onOpenChange,
  storyId,
  suggestedCharacters,
  onSuccess,
}: SyncNovelCharactersDialogProps) {
  const { toast } = useToast();
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  // 初始化选中所有未生成的角色
  useEffect(() => {
    if (open) {
      const ungenerated = suggestedCharacters
        .filter((char) => !char.generated)
        .map((char) => char.name);
      setSelectedNames(new Set(ungenerated));
    }
  }, [open, suggestedCharacters]);

  const handleToggle = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allNames = suggestedCharacters
      .filter((char) => !char.generated)
      .map((char) => char.name);
    setSelectedNames(new Set(allNames));
  };

  const handleDeselectAll = () => {
    setSelectedNames(new Set());
  };

  const handleSync = async () => {
    if (selectedNames.size === 0) {
      toast({
        title: "提示",
        description: "请至少选择一个角色",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncing(true);

      const response = await fetch(`/api/story/${storyId}/sync-novel-characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_names: Array.from(selectedNames),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "同步失败");
      }

      const result = await response.json();

      toast({
        title: "同步成功",
        description: `已同步 ${result.synced_count} 个角色${
          result.skipped_count > 0 ? `，跳过 ${result.skipped_count} 个已存在的角色` : ""
        }`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Sync characters error:", error);
      toast({
        title: "同步失败",
        description: error instanceof Error ? error.message : "同步角色失败",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const ungeneratedCharacters = suggestedCharacters.filter((char) => !char.generated);
  const generatedCharacters = suggestedCharacters.filter((char) => char.generated);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            从小说同步角色
          </DialogTitle>
          <DialogDescription>
            选择需要同步到剧本的角色，系统将自动创建角色并关联到当前剧本
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              共 {suggestedCharacters.length} 个角色
              {generatedCharacters.length > 0 && (
                <span className="text-green-600 ml-1">
                  （{generatedCharacters.length} 个已同步）
                </span>
              )}
            </span>
            {ungeneratedCharacters.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={syncing}
                >
                  全选
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={syncing}
                >
                  取消全选
                </Button>
              </div>
            )}
          </div>

          {/* 角色列表 */}
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-3">
              {ungeneratedCharacters.length === 0 && generatedCharacters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>未找到建议角色</p>
                  <p className="text-sm mt-1">请先执行角色分析</p>
                </div>
              )}

              {ungeneratedCharacters.map((char) => (
                <div
                  key={char.name}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedNames.has(char.name)}
                    onCheckedChange={() => handleToggle(char.name)}
                    disabled={syncing}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{char.name}</h4>
                      <Badge
                        variant="secondary"
                        className={`${roleColors[char.role]} text-white`}
                      >
                        {roleLabels[char.role] || char.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {char.description}
                    </p>
                    <p className="text-xs text-muted-foreground/80 italic">
                      外观: {char.appearance}
                    </p>
                  </div>
                </div>
              ))}

              {generatedCharacters.length > 0 && (
                <>
                  {ungeneratedCharacters.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-medium text-muted-foreground mb-3">
                        已同步的角色
                      </p>
                    </div>
                  )}
                  {generatedCharacters.map((char) => (
                    <div
                      key={char.name}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50 opacity-60"
                    >
                      <Checkbox checked={false} disabled className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{char.name}</h4>
                          <Badge variant="secondary" className="bg-green-500 text-white">
                            已同步
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {char.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncing}
          >
            取消
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing || selectedNames.size === 0}
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                同步中...
              </>
            ) : (
              `同步选中的 ${selectedNames.size} 个角色`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
