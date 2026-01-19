/**
 * 世界观记忆库 Tab - 条目管理
 * 使用 SWR 进行数据缓存和自动刷新
 */
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  BookOpen,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { novelTheme } from "../../../theme";
import { worldService } from "../../services/worldService";
import {
  WorldEntry,
  EntryType,
  ENTRY_TYPE_CONFIG,
} from "../../types/world";
import { useWorldEntries, invalidateEntries } from "../../hooks/useWorldData";
import { EntryForm } from "./EntryForm";
import { EntryDetail } from "./EntryDetail";
import { EntryCard, EntryCardSkeleton, ENTRY_ICONS } from "./EntryCard";
import { ExtractWorldEntriesDialog } from "./ExtractWorldEntriesDialog";
import type { NovelChapter } from "../../types";

interface WorldEntriesTabProps {
  projectId: string;
  chapters?: NovelChapter[] | null;  // ✅ 新增：接收完整章节列表
}

export function WorldEntriesTab({ projectId, chapters }: WorldEntriesTabProps) {
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EntryType | "all">("all");

  // ✅ 调试：检查 chapters 数据（仅初始化时）
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[WorldEntriesTab] Received chapters:", {
        count: chapters?.length || 0,
        hasContent: chapters?.filter(ch => ch.content && ch.content.length > 0).length || 0,
        preview: chapters?.slice(0, 2).map(ch => ({
          id: ch.id,
          number: ch.chapter_number,
          title: ch.title,
          hasContent: !!ch.content,
          contentLength: ch.content?.length || 0,
        })),
      });
    }
  }, [chapters]);

  // 选中和编辑状态
  const [selectedEntry, setSelectedEntry] = useState<WorldEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorldEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<WorldEntry | null>(null);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);

  // 使用 SWR 获取数据
  const queryParams = useMemo(() => ({
    type: typeFilter === "all" ? undefined : typeFilter,
    search: searchQuery || undefined,
    limit: 100,
  }), [typeFilter, searchQuery]);

  const { entries, total, byType, error, isLoading, refresh } = useWorldEntries(
    projectId,
    queryParams
  );

  // 创建条目
  const handleCreate = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  // 编辑条目
  const handleEdit = (entry: WorldEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  // 查看详情
  const handleViewDetail = (entry: WorldEntry) => {
    setSelectedEntry(entry);
    setIsDetailOpen(true);
  };

  // 删除确认
  const handleDeleteConfirm = async () => {
    if (!deleteEntry) return;

    try {
      await worldService.deleteEntry(projectId, deleteEntry.id);
      toast.success("删除成功");
      setDeleteEntry(null);
      setIsDetailOpen(false);
      invalidateEntries(projectId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      toast.error(message);
    }
  };

  // 保存条目
  const handleSaveEntry = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
    invalidateEntries(projectId);
  };

  // 渲染类型统计
  const renderTypeStats = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant={typeFilter === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => setTypeFilter("all")}
      >
        全部 ({total})
      </Button>
      {(Object.keys(ENTRY_TYPE_CONFIG) as EntryType[]).map((type) => {
        const config = ENTRY_TYPE_CONFIG[type];
        const count = byType[type] || 0;
        const Icon = ENTRY_ICONS[type];
        return (
          <Button
            key={type}
            variant={typeFilter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(type)}
            className="gap-1"
          >
            <Icon className="h-3 w-3" />
            {config.label} ({count})
          </Button>
        );
      })}
    </div>
  );

  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>{error.message || "加载失败"}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refresh()}>
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn(novelTheme.text.heading, "text-lg")}>世界观记忆库</h2>
          <p className="text-sm text-muted-foreground">
            管理地点、人物、事件、物品、规则和伏笔
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsExtractDialogOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI 提取
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            新建条目
          </Button>
        </div>
      </div>

      {/* 筛选区 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索条目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 类型统计 */}
      {renderTypeStats()}

      {/* 条目列表 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <EntryCardSkeleton key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="h-8 w-8 mb-2" />
          <p>暂无条目</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleCreate}>
            创建第一个条目
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onClick={handleViewDetail}
            />
          ))}
        </div>
      )}

      {/* 详情侧边栏 */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>条目详情</SheetTitle>
            <SheetDescription>查看和管理条目信息</SheetDescription>
          </SheetHeader>
          {selectedEntry && (
            <EntryDetail
              entry={selectedEntry}
              projectId={projectId}
              onEdit={() => handleEdit(selectedEntry)}
              onDelete={() => setDeleteEntry(selectedEntry)}
              onRelationChange={() => invalidateEntries(projectId)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 表单侧边栏 */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>{editingEntry ? "编辑条目" : "新建条目"}</SheetTitle>
            <SheetDescription>
              {editingEntry ? "修改条目信息" : "创建新的世界观条目"}
            </SheetDescription>
          </SheetHeader>
          <EntryForm
            projectId={projectId}
            entry={editingEntry}
            onSave={handleSaveEntry}
            onCancel={() => setIsFormOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除条目 &quot;{deleteEntry?.name}&quot; 吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI 提取对话框 */}
      <ExtractWorldEntriesDialog
        projectId={projectId}
        chapters={chapters || []}  // ✅ 传递章节数据，空数组作为默认值
        open={isExtractDialogOpen}
        onOpenChange={setIsExtractDialogOpen}
        onSuccess={() => invalidateEntries(projectId)}
      />
    </div>
  );
}
