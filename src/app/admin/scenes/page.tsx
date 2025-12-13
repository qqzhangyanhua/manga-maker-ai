"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
import { RotateCcw, Eye, Trash2, ImageIcon, MapPin } from "lucide-react";
import type { Scene, SceneWithUser, SceneFilter } from "./types";
import { SCENE_TYPES, getSceneTypeLabel } from "./types";
import type { UserBrief } from "@/types/admin";

/**
 * 场景管理页面
 */
export default function ScenesPage() {
  const { toast } = useToast();

  // 详情对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<SceneWithUser | null>(null);

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingScene, setDeletingScene] = useState<SceneWithUser | null>(null);
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
  } = useAdminList<Scene, SceneFilter>({
    endpoint: "/api/admin/scenes",
    initialFilter: {},
    initialPageSize: 20,
  });

  const allUsers = (extra.allUsers || []) as UserBrief[];

  const scenesWithUser: SceneWithUser[] = useMemo(() => {
    const userMap = (extra.userMap || {}) as Record<string, UserBrief>;
    return items.map((scene) => ({
      ...scene,
      user: userMap[scene.user_id],
    }));
  }, [items, extra.userMap]);

  // 删除操作
  const handleDelete = async () => {
    if (!deletingScene) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/scenes/${deletingScene.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingScene(null);
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
        <h1 className="text-2xl font-bold">场景库</h1>
        <p className="text-muted-foreground mt-1">
          查看和管理所有用户的场景资源
        </p>
      </div>

      {/* 过滤栏 */}
      <div className="grid gap-4 md:grid-cols-4 p-4 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="keyword" className="text-xs">关键词</Label>
          <Input
            id="keyword"
            placeholder="搜索名称或描述"
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
          <Label htmlFor="sceneType" className="text-xs">场景类型</Label>
          <Select
            value={filter.sceneType || "all"}
            onValueChange={(value) => setFilter({ ...filter, sceneType: value === "all" ? undefined : value })}
            disabled={loading}
          >
            <SelectTrigger id="sceneType" className="h-9">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {SCENE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
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
      ) : scenesWithUser.length === 0 ? (
        <AdminEmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="暂无场景"
          description="当前筛选条件下没有找到任何场景"
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">预览</TableHead>
                <TableHead>名称</TableHead>
                <TableHead className="w-[100px]">类型</TableHead>
                <TableHead className="w-[150px]">用户</TableHead>
                <TableHead className="w-[80px]">使用次数</TableHead>
                <TableHead className="w-[150px]">创建时间</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenesWithUser.map((scene) => (
                <TableRow key={scene.id}>
                  <TableCell>
                    <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                      {scene.image_url ? (
                        <Image
                          src={scene.image_url}
                          alt={scene.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{scene.name}</div>
                      {scene.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {scene.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getSceneTypeLabel(scene.scene_type)}</TableCell>
                  <TableCell>
                    <span className="text-sm truncate">
                      {scene.user?.name || scene.user?.email || "-"}
                    </span>
                  </TableCell>
                  <TableCell>{scene.usage_count}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(scene.created_at).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedScene(scene);
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
                          setDeletingScene(scene);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>场景详情</DialogTitle>
          </DialogHeader>
          {selectedScene && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                {selectedScene.image_url ? (
                  <Image
                    src={selectedScene.image_url}
                    alt={selectedScene.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">名称</div>
                  <div className="font-medium">{selectedScene.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">类型</div>
                  <div>{getSceneTypeLabel(selectedScene.scene_type)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">用户</div>
                  <div>{selectedScene.user?.name || selectedScene.user?.email || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">描述</div>
                  <div>{selectedScene.description || "-"}</div>
                </div>
                {selectedScene.prompt && (
                  <div>
                    <div className="text-xs text-muted-foreground">Prompt</div>
                    <ScrollArea className="h-[100px] border rounded p-2 mt-1">
                      <div className="text-xs">{selectedScene.prompt}</div>
                    </ScrollArea>
                  </div>
                )}
                {selectedScene.tags.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground">标签</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedScene.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
            确定要删除场景 <strong>{deletingScene?.name}</strong> 吗？此操作不可撤销。
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
            <TableHead className="w-[80px]">预览</TableHead>
            <TableHead>名称</TableHead>
            <TableHead className="w-[100px]">类型</TableHead>
            <TableHead className="w-[150px]">用户</TableHead>
            <TableHead className="w-[80px]">使用次数</TableHead>
            <TableHead className="w-[150px]">创建时间</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="w-12 h-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
