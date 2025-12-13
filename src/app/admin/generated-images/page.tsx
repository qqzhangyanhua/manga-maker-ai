"use client";

import { useState, useMemo, useCallback } from "react";
import { useAdminList } from "@/hooks/admin";
import { AdminPagination, AdminDeleteDialog } from "@/components/admin";
import { useToast } from "@/hooks/use-toast";
import { ImageFilterBar, ImageGrid, ImageDetailDialog } from "./components";
import type {
  GeneratedImage,
  GeneratedImageWithUser,
  GeneratedImageFilter,
} from "./types";
import type { UserBrief } from "@/types/admin";

/**
 * 生成图片管理页面
 *
 * 功能：
 * - 查看所有用户生成的图片
 * - 按用户、来源类型、风格、时间过滤
 * - 查看图片详情和 prompt
 * - 单个删除和批量删除
 */
export default function GeneratedImagesPage() {
  const { toast } = useToast();

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 详情对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageWithUser | null>(null);

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingImage, setDeletingImage] = useState<GeneratedImageWithUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 批量删除对话框状态
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

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
  } = useAdminList<GeneratedImage, GeneratedImageFilter>({
    endpoint: "/api/admin/generated-images",
    initialFilter: {},
    initialPageSize: 20,
  });

  // 从 extra 中获取用户列表
  const allUsers = (extra.allUsers || []) as UserBrief[];

  // 将图片数据与用户信息合并
  const imagesWithUser: GeneratedImageWithUser[] = useMemo(() => {
    const userMap = (extra.userMap || {}) as Record<string, UserBrief>;
    return items.map((image) => ({
      ...image,
      user: userMap[image.user_id],
    }));
  }, [items, extra.userMap]);

  // 选择操作
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((img) => img.id)));
  }, [items]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 查看详情
  const handleViewDetail = (image: GeneratedImageWithUser) => {
    setSelectedImage(image);
    setDetailDialogOpen(true);
  };

  // 打开删除对话框
  const handleOpenDelete = (image: GeneratedImageWithUser) => {
    setDeletingImage(image);
    setDeleteDialogOpen(true);
  };

  // 从详情对话框删除
  const handleDeleteFromDetail = () => {
    if (selectedImage) {
      setDetailDialogOpen(false);
      setDeletingImage(selectedImage);
      setDeleteDialogOpen(true);
    }
  };

  // 执行单个删除
  const handleConfirmDelete = async () => {
    if (!deletingImage) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/generated-images/${deletingImage.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingImage(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingImage.id);
        return next;
      });
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // 执行批量删除
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/admin/generated-images/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "批量删除失败");
      }

      toast({ title: result.message || "批量删除成功" });
      setBatchDeleteDialogOpen(false);
      setSelectedIds(new Set());
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量删除失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">生成图片</h1>
        <p className="text-muted-foreground mt-1">
          查看和管理所有用户生成的图片
        </p>
      </div>

      {/* 过滤栏 */}
      <ImageFilterBar
        filter={filter}
        onFilterChange={setFilter}
        users={allUsers}
        loading={loading}
        selectedCount={selectedIds.size}
        onBatchDelete={() => setBatchDeleteDialogOpen(true)}
      />

      {/* 图片网格 */}
      <ImageGrid
        images={imagesWithUser}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onViewDetail={handleViewDetail}
        onDelete={handleOpenDelete}
      />

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
      <ImageDetailDialog
        open={detailDialogOpen}
        image={selectedImage}
        onOpenChange={setDetailDialogOpen}
        onDelete={handleDeleteFromDetail}
      />

      {/* 单个删除确认 */}
      <AdminDeleteDialog
        open={deleteDialogOpen}
        title="删除确认"
        description={
          <>
            确定要删除这张图片吗？此操作不可撤销。
          </>
        }
        loading={deleting}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
      />

      {/* 批量删除确认 */}
      <AdminDeleteDialog
        open={batchDeleteDialogOpen}
        title="批量删除确认"
        description={
          <>
            确定要删除选中的 <strong>{selectedIds.size}</strong> 张图片吗？此操作不可撤销。
          </>
        }
        loading={deleting}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={handleConfirmBatchDelete}
      />
    </div>
  );
}
