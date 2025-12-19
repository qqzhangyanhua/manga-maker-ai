"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Tags, RotateCcw, Edit, Plus, Trash2, GitMerge } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tag, TagFilter, TagFormData } from "./types";
import {
  TAG_TYPES,
  TAG_CATEGORIES,
  getTypeLabel,
  getCategoryLabel,
  getEmptyForm,
} from "./types";
import { TagMergeDialog } from "./components";

/**
 * 标签管理页面
 */
export default function TagsPage() {
  const { toast } = useToast();

  // 表单对话框状态
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [form, setForm] = useState<TagFormData>(getEmptyForm());
  const [submitting, setSubmitting] = useState(false);

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 合并对话框状态
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergingTag, setMergingTag] = useState<Tag | null>(null);

  // 使用通用列表 hook
  const {
    items: tags,
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
  } = useAdminList<Tag, TagFilter>({
    endpoint: "/api/admin/tags",
    initialFilter: {},
    initialPageSize: 20,
  });

  // 打开创建对话框
  const handleOpenCreate = () => {
    setEditingTag(null);
    setForm(getEmptyForm());
    setFormDialogOpen(true);
  };

  // 打开编辑对话框
  const handleOpenEdit = (tag: Tag) => {
    setEditingTag(tag);
    setForm({
      name: tag.name,
      type: tag.type,
      category: tag.category || "",
    });
    setFormDialogOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "请输入标签名称", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingTag
        ? `/api/admin/tags/${editingTag.id}`
        : "/api/admin/tags";
      const method = editingTag ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          category: form.category || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "操作失败");
      }

      toast({ title: result.message || "操作成功" });
      setFormDialogOpen(false);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除标签
  const handleDelete = async () => {
    if (!deletingTag) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/tags/${deletingTag.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingTag(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // 合并标签
  const handleMerge = async (sourceTagId: string, targetTagId: string) => {
    try {
      const response = await fetch("/api/admin/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTagId, targetTagId }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "合并失败");
      }

      toast({ title: result.message || "合并成功" });
      setMergeDialogOpen(false);
      setMergingTag(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "合并失败";
      toast({ title: message, variant: "destructive" });
      throw error; // 让对话框知道失败了
    }
  };

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-orange-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <Tags className="w-12 h-12 text-primary drop-shadow-md" />
            标签管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            管理系统标签和用户标签
          </p>
          <div className="absolute top-0 right-0 z-20 flex gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="bg-background">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回后台
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-5 comic-card bg-card space-y-6">
          <div className="flex justify-between items-start">
            <div className="grid gap-4 md:grid-cols-4 flex-1 mr-4">
              <div className="space-y-2">
                <Label htmlFor="keyword" className="text-xs">关键词</Label>
                <Input
                  id="keyword"
                  placeholder="搜索标签名称"
                  value={filter.keyword || ""}
                  onChange={(e) => setFilter({ ...filter, keyword: e.target.value || undefined })}
                  disabled={loading}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs">类型</Label>
                <Select
                  value={filter.type || "all"}
                  onValueChange={(value) => setFilter({ ...filter, type: value === "all" ? undefined : value })}
                  disabled={loading}
                >
                  <SelectTrigger id="type" className="h-9">
                    <SelectValue placeholder="全部类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {TAG_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs">分类</Label>
                <Select
                  value={filter.category || "all"}
                  onValueChange={(value) => setFilter({ ...filter, category: value === "all" ? undefined : value })}
                  disabled={loading}
                >
                  <SelectTrigger id="category" className="h-9">
                    <SelectValue placeholder="全部分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {TAG_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
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

            <Button
              onClick={handleOpenCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建标签
            </Button>
          </div>
        </div>

        <div className="p-5 comic-card bg-card overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : tags.length === 0 ? (
            <AdminEmptyState
              icon={<Tags className="h-12 w-12" />}
              title="暂无标签"
              description="当前筛选条件下没有找到任何标签"
              action={
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个标签
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead className="w-[100px]">类型</TableHead>
                    <TableHead className="w-[100px]">分类</TableHead>
                    <TableHead className="w-[100px]">使用次数</TableHead>
                    <TableHead className="w-[150px]">创建时间</TableHead>
                    <TableHead className="w-[150px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tag.type === "system" ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-600"
                          }`}>
                          {getTypeLabel(tag.type)}
                        </span>
                      </TableCell>
                      <TableCell>{getCategoryLabel(tag.category)}</TableCell>
                      <TableCell>{tag.usage_count}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(tag.created_at).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(tag)}
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setMergingTag(tag);
                              setMergeDialogOpen(true);
                            }}
                            title="合并到其他标签"
                          >
                            <GitMerge className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              setDeletingTag(tag);
                              setDeleteDialogOpen(true);
                            }}
                            title="删除"
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
        </div>

        {/* 表单对话框 */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? "编辑标签" : "创建标签"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tagName">名称</Label>
                <Input
                  id="tagName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="输入标签名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagType">类型</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger id="tagType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagCategory">分类（可选）</Label>
                <Select
                  value={form.category || "none"}
                  onValueChange={(value) => setForm({ ...form, category: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="tagCategory">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无分类</SelectItem>
                    {TAG_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认 */}
        <AdminDeleteDialog
          open={deleteDialogOpen}
          title="删除确认"
          description={
            <>
              确定要删除标签 <strong>{deletingTag?.name}</strong> 吗？
              {deletingTag && deletingTag.usage_count > 0 && (
                <span className="text-orange-600 block mt-2">
                  警告：该标签已被使用 {deletingTag.usage_count} 次，删除后相关引用也会被移除。
                </span>
              )}
            </>
          }
          loading={deleting}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
        />

        {/* 合并对话框 */}
        <TagMergeDialog
          open={mergeDialogOpen}
          tags={tags}
          sourceTag={mergingTag}
          onOpenChange={setMergeDialogOpen}
          onMerge={handleMerge}
        />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead className="w-[100px]">类型</TableHead>
            <TableHead className="w-[100px]">分类</TableHead>
            <TableHead className="w-[100px]">使用次数</TableHead>
            <TableHead className="w-[150px]">创建时间</TableHead>
            <TableHead className="w-[150px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
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
