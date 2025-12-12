"use client";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, RotateCcw, Info } from "lucide-react";
import { ProjectVersion } from "@/types/template";

interface RestoreVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: ProjectVersion | null;
  projectId: string;
  onRestore: (data: RestoreVersionData) => Promise<void>;
}

export interface RestoreVersionData {
  projectId: string;
  versionId: string;
  createBackup: boolean;
}

export function RestoreVersionDialog({
  open,
  onOpenChange,
  version,
  projectId,
  onRestore
}: RestoreVersionDialogProps) {
  const [createBackup, setCreateBackup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleRestore = async () => {
    if (!version) return;

    setIsLoading(true);
    try {
      await onRestore({
        projectId,
        versionId: version.id,
        createBackup
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to restore version:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!version) return null;

  const versionData = version.version_data as any;
  const panelCount = versionData.panels?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>恢复版本</DialogTitle>
          <DialogDescription>
            将项目恢复到版本 {version.version_number}
            {version.label && ` (${version.label})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version info */}
          <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">版本号:</span>
              <span className="font-medium">版本 {version.version_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">分镜数量:</span>
              <span className="font-medium">{panelCount} 个</span>
            </div>
            {version.change_summary && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">变更说明:</span>
                <span className="font-medium">{version.change_summary}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建时间:</span>
              <span className="font-medium">
                {new Date(version.created_at).toLocaleString("zh-CN")}
              </span>
            </div>
          </div>

          {/* Backup option */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="backup" className="font-medium">
                创建恢复前备份
              </Label>
              <p className="text-sm text-muted-foreground">
                在恢复前自动创建当前状态的备份版本
              </p>
            </div>
            <Switch
              id="backup"
              checked={createBackup}
              onCheckedChange={setCreateBackup}
            />
          </div>

          {/* Warning alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">警告：此操作将：</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>删除所有当前分镜</li>
                <li>恢复版本中的所有分镜</li>
                <li>更新项目标题、描述和风格</li>
                <li>恢复脚本内容（如有）</li>
              </ul>
              {!createBackup && (
                <p className="mt-2 text-sm font-semibold">
                  未启用备份，当前状态将无法恢复！
                </p>
              )}
            </AlertDescription>
          </Alert>

          {/* Info about backup */}
          {createBackup && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                恢复前将自动创建一个固定版本的备份，您随时可以恢复到备份版本。
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleRestore}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                恢复中...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                确认恢复
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
