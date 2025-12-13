"use client";

import { useState, useMemo } from "react";
import { useAdminList } from "@/hooks/admin";
import {
  AdminPagination,
  AdminDeleteDialog,
  AdminEmptyState,
} from "@/components/admin";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, Eye, Trash2, BookOpen } from "lucide-react";
import type { Story, StoryWithUser, StoryFilter } from "./types";
import { STORY_GENRES, STORY_STATUS, getGenreLabel, getStatusStyle } from "./types";
import type { UserBrief } from "@/types/admin";

/**
 * 故事管理页面
 */
export default function StoriesPage() {
  const { toast } = useToast();

  // 详情对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryWithUser | null>(null);

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStory, setDeletingStory] = useState<StoryWithUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 使用通用列表 hook
  const {
    items,
    loading,
    total,
    page,
    pageSize,
    totalPages,
    filter,
    setFilter,
    setPage,
    setPageSize,
    refetch,
    extra,
  } = useAdminList<Story, StoryFilter>({
    endpoint: "/api/admin/stories",
    initialFilter: {},
    initialPageSize: 20,
  });

  const allUsers = (extra.allUsers || []) as UserBrief[];

  const storiesWithUser: StoryWithUser[] = useMemo(() => {
    const userMap = (extra.userMap || {}) as Record<string, UserBrief>;
    return items.map((story) => ({
      ...story,
      user: userMap[story.user_id],
    }));
  }, [items, extra.userMap]);

  // 删除操作
  const handleDelete = async () => {
    if (!deletingStory) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/stories/${deletingStory.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingStory(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">故事管理</h1>
        <p className="text-muted-foreground mt-1">
          查看和管理所有用户创建的故事
        </p>
      </div>

      {/* 过滤栏 */}
      <div className="grid gap-4 md:grid-cols-5 p-4 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="keyword" className="text-xs">关键词</Label>
          <Input
            id="keyword"
            placeholder="搜索标题或简介"
            value={filter.keyword || ""}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value || undefined })}
            disabled={loading}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="userId" className="text-xs">用户</Label>
          <Select
            value={filter.userId || "all"}
            onValueChange={(value) => setFilter({ ...filter, userId: value === "all" ? undefined : value })}
            disabled={loading}
          >
            <SelectTrigger id="userId" className="h-9">
              <SelectValue placeholder="全部用户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              {allUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="genre" className="text-xs">类型</Label>
          <Select
            value={filter.genre || "all"}
            onValueChange={(value) => setFilter({ ...filter, genre: value === "all" ? undefined : value })}
            disabled={loading}
          >
            <SelectTrigger id="genre" className="h-9">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {STORY_GENRES.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs">状态</Label>
          <Select
            value={filter.status || "all"}
            onValueChange={(value) => setFilter({ ...filter, status: value === "all" ? undefined : value })}
            disabled={loading}
          >
            <SelectTrigger id="status" className="h-9">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {STORY_STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs invisible">操作</Label>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setFilter({})}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 表格 */}
      {loading ? (
        <TableSkeleton />
      ) : storiesWithUser.length === 0 ? (
        <AdminEmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="暂无故事"
          description="当前筛选条件下没有找到任何故事"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead className="w-[80px]">类型</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[150px]">用户</TableHead>
                <TableHead className="w-[80px]">角色数</TableHead>
                <TableHead className="w-[80px]">项目数</TableHead>
                <TableHead className="w-[150px]">创建时间</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storiesWithUser.map((story) => {
                const statusStyle = getStatusStyle(story.status);
                return (
                  <TableRow key={story.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{story.title}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {story.premise}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getGenreLabel(story.genre)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyle.color}`}>
                        {statusStyle.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate">
                        {story.user?.name || story.user?.email || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{story._count?.story_characters || 0}</TableCell>
                    <TableCell>{story._count?.projects || 0}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(story.created_at).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedStory(story);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setDeletingStory(story);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 分页 */}
      {total > 0 && (
        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>故事详情</DialogTitle>
          </DialogHeader>
          {selectedStory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">标题</div>
                  <div className="font-medium">{selectedStory.title}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">类型</div>
                  <div>{getGenreLabel(selectedStory.genre)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">状态</div>
                  <div>{getStatusStyle(selectedStory.status).label}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">用户</div>
                  <div>{selectedStory.user?.name || selectedStory.user?.email || "-"}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">故事简介</div>
                <div className="text-sm bg-muted/30 p-3 rounded">{selectedStory.premise}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">故事大纲 (JSON)</div>
                <ScrollArea className="h-[250px] border rounded p-3">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedStory.outline, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AdminDeleteDialog
        open={deleteDialogOpen}
        title="删除确认"
        description={
          <>
            确定要删除故事 <strong>{deletingStory?.title}</strong> 吗？
            {deletingStory?._count?.projects ? (
              <span className="text-red-600 block mt-2">
                警告：该故事有 {deletingStory._count.projects} 个关联项目，无法删除。
              </span>
            ) : (
              <span className="block mt-2">此操作不可撤销。</span>
            )}
          </>
        }
        loading={deleting}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>标题</TableHead>
            <TableHead className="w-[80px]">类型</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[150px]">用户</TableHead>
            <TableHead className="w-[80px]">角色数</TableHead>
            <TableHead className="w-[80px]">项目数</TableHead>
            <TableHead className="w-[150px]">创建时间</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
