/**
 * 伏笔管理 Tab
 * 使用 SWR 进行数据缓存和自动刷新
 */
"use client";

import { useState } from "react";
import {
  EyeOff,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { novelTheme } from "../../../theme";
import { worldService } from "../../services/worldService";
import {
  WorldEntry,
  ForeshadowingStats,
  ForeshadowStatus,
} from "../../types/world";
import { useForeshadowing, invalidateForeshadowing } from "../../hooks/useWorldData";
import { EntryForm } from "./EntryForm";
import { ForeshadowCard, ForeshadowCardSkeleton } from "./ForeshadowCard";

interface ForeshadowingTabProps {
  projectId: string;
  currentChapter?: number;
}

export function ForeshadowingTab({ projectId, currentChapter = 1 }: ForeshadowingTabProps) {
  // 状态更新对话框
  const [statusUpdateEntry, setStatusUpdateEntry] = useState<WorldEntry | null>(null);
  const [newStatus, setNewStatus] = useState<ForeshadowStatus>("planted");
  const [actualRevealChapter, setActualRevealChapter] = useState<number | undefined>();

  // 表单侧边栏
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 使用 SWR 获取数据
  const { stats, planted, brewing, revealed, error, isLoading, refresh } = useForeshadowing(projectId);

  // 更新伏笔状态
  const handleUpdateStatus = async () => {
    if (!statusUpdateEntry) return;

    try {
      await worldService.updateForeshadowStatus(projectId, statusUpdateEntry.id, {
        status: newStatus,
        actual_reveal_chapter: newStatus === "revealed" ? actualRevealChapter : undefined,
      });
      toast.success("状态更新成功");
      setStatusUpdateEntry(null);
      invalidateForeshadowing(projectId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "更新失败";
      toast.error(message);
    }
  };

  // 打开状态更新对话框
  const openStatusDialog = (entry: WorldEntry) => {
    setStatusUpdateEntry(entry);
    setNewStatus(entry.foreshadow_status as ForeshadowStatus || "planted");
    setActualRevealChapter(entry.actual_reveal_chapter || currentChapter);
  };

  // 渲染统计卡片
  const renderStatsCard = (statsData: ForeshadowingStats) => {
    const total = statsData.total || 1;
    const revealedPercent = (statsData.revealed / total) * 100;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">伏笔进度</CardTitle>
          <CardDescription>当前章节：第 {currentChapter} 章</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>揭示进度</span>
              <span className="text-muted-foreground">
                {statsData.revealed} / {statsData.total}
              </span>
            </div>
            <Progress value={revealedPercent} className="h-2" />

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-purple-500">
                  <Clock className="h-4 w-4" />
                  <span className="text-lg font-semibold">{statsData.planted}</span>
                </div>
                <span className="text-xs text-muted-foreground">已埋设</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-lg font-semibold">{statsData.brewing}</span>
                </div>
                <span className="text-xs text-muted-foreground">酝酿中</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-lg font-semibold">{statsData.revealed}</span>
                </div>
                <span className="text-xs text-muted-foreground">已揭示</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ForeshadowCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p>{error.message || "加载失败"}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refresh()}>
          重试
        </Button>
      </div>
    );
  }

  const defaultStats: ForeshadowingStats = {
    planted: 0,
    brewing: 0,
    revealed: 0,
    total: 0,
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(novelTheme.text.heading, "text-lg")}>伏笔管理</h2>
          <p className="text-sm text-muted-foreground">
            追踪和管理故事中的伏笔线索
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新建伏笔
        </Button>
      </div>

      {/* 统计卡片 */}
      {renderStatsCard(stats || defaultStats)}

      {/* 已埋设 */}
      {planted.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-500" />
            已埋设的伏笔
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planted.map((entry) => (
              <ForeshadowCard
                key={entry.id}
                entry={entry}
                currentChapter={currentChapter}
                onUpdateStatus={openStatusDialog}
              />
            ))}
          </div>
        </div>
      )}

      {/* 酝酿中 */}
      {brewing.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            酝酿中的伏笔
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brewing.map((entry) => (
              <ForeshadowCard
                key={entry.id}
                entry={entry}
                currentChapter={currentChapter}
                onUpdateStatus={openStatusDialog}
              />
            ))}
          </div>
        </div>
      )}

      {/* 已揭示 */}
      {revealed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            已揭示的伏笔
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revealed.map((entry) => (
              <ForeshadowCard
                key={entry.id}
                entry={entry}
                currentChapter={currentChapter}
                onUpdateStatus={openStatusDialog}
              />
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {(stats?.total ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <EyeOff className="h-8 w-8 mb-2" />
          <p>暂无伏笔</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsFormOpen(true)}>
            创建第一个伏笔
          </Button>
        </div>
      )}

      {/* 新建伏笔弹窗 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[500px] h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>新建伏笔</DialogTitle>
            <DialogDescription>创建一个新的伏笔并设置揭示计划</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-6">
            <EntryForm
              projectId={projectId}
              defaultType="foreshadowing"
              onSave={() => {
                setIsFormOpen(false);
                invalidateForeshadowing(projectId);
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 状态更新对话框 */}
      <Dialog
        open={!!statusUpdateEntry}
        onOpenChange={() => setStatusUpdateEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新伏笔状态</DialogTitle>
            <DialogDescription>
              更新 &quot;{statusUpdateEntry?.name}&quot; 的状态
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">新状态</label>
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as ForeshadowStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planted">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      已埋设
                    </div>
                  </SelectItem>
                  <SelectItem value="brewing">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      酝酿中
                    </div>
                  </SelectItem>
                  <SelectItem value="revealed">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      已揭示
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStatus === "revealed" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">实际揭示章节</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 border rounded-md"
                  value={actualRevealChapter || ""}
                  onChange={(e) =>
                    setActualRevealChapter(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="在第几章揭示"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusUpdateEntry(null)}>
              取消
            </Button>
            <Button onClick={handleUpdateStatus}>确认更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
