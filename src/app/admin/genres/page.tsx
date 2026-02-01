"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, RotateCcw, Edit, Plus, Trash2, Check, X } from "lucide-react";
import {
  AdminPagination,
  AdminDeleteDialog,
  AdminEmptyState,
} from "@/components/admin";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import type { Genre, GenreFormData } from "./types";
import { getEmptyForm } from "./types";

/**
 * 专题管理页面
 */
export default function GenresPage() {
  const { toast } = useToast();

  // 数据状态
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  // 表单对话框状态
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [form, setForm] = useState<GenreFormData>(getEmptyForm());
  const [submitting, setSubmitting] = useState(false);

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGenre, setDeletingGenre] = useState<Genre | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 获取专题列表
  const fetchGenres = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (includeInactive) {
        params.set("includeInactive", "true");
      }
      const response = await fetch(`/api/admin/genres?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取专题列表失败");
      }

      setGenres(result.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取专题列表失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [includeInactive, toast]);

  useEffect(() => {
    fetchGenres();
  }, [fetchGenres]);

  // 打开创建对话框
  const handleOpenCreate = () => {
    setEditingGenre(null);
    setForm(getEmptyForm());
    setFormDialogOpen(true);
  };

  // 打开编辑对话框
  const handleOpenEdit = (genre: Genre) => {
    setEditingGenre(genre);
    setForm({
      code: genre.code,
      display_name: genre.display_name,
      description: genre.description || "",
      sort_order: genre.sort_order,
      is_active: genre.is_active,
    });
    setFormDialogOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!form.code.trim()) {
      toast({ title: "请输入专题代码", variant: "destructive" });
      return;
    }
    if (!form.display_name.trim()) {
      toast({ title: "请输入显示名称", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingGenre
        ? `/api/admin/genres/${editingGenre.id}`
        : "/api/admin/genres";
      const method = editingGenre ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toLowerCase(),
          display_name: form.display_name.trim(),
          description: form.description.trim() || null,
          sort_order: form.sort_order,
          is_active: form.is_active,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "操作失败");
      }

      toast({ title: result.message || "操作成功" });
      setFormDialogOpen(false);
      fetchGenres();
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除专题
  const handleDelete = async () => {
    if (!deletingGenre) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/genres/${deletingGenre.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingGenre(null);
      fetchGenres();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <BookOpen className="w-12 h-12 text-primary drop-shadow-md" />
            专题管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            管理小说专题类型（玄幻、都市、悬疑等）
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
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="includeInactive"
                  checked={includeInactive}
                  onCheckedChange={setIncludeInactive}
                />
                <Label htmlFor="includeInactive" className="text-sm">
                  显示已禁用
                </Label>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={fetchGenres}
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handleOpenCreate}
              className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建专题
            </Button>
          </div>
        </div>

        <div className="p-5 comic-card bg-card overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : genres.length === 0 ? (
            <AdminEmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title="暂无专题"
              description="还没有创建任何专题类型"
              action={
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个专题
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">代码</TableHead>
                    <TableHead>显示名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="w-[80px]">排序</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[150px]">创建时间</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {genres.map((genre) => (
                    <TableRow key={genre.id} className={!genre.is_active ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm">{genre.code}</TableCell>
                      <TableCell className="font-medium">{genre.display_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {genre.description || "-"}
                      </TableCell>
                      <TableCell>{genre.sort_order}</TableCell>
                      <TableCell>
                        {genre.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <Check className="h-4 w-4" />
                            启用
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <X className="h-4 w-4" />
                            禁用
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(genre.created_at).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(genre)}
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              setDeletingGenre(genre);
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
        </div>

        {/* 表单对话框 */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGenre ? "编辑专题" : "创建专题"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="genreCode">代码</Label>
                <Input
                  id="genreCode"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="如 xuanhuan, dushi"
                  disabled={!!editingGenre}
                />
                <p className="text-xs text-muted-foreground">
                  只能包含小写字母、数字和下划线，创建后不可修改
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="genreDisplayName">显示名称</Label>
                <Input
                  id="genreDisplayName"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="如 玄幻, 都市"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genreDescription">描述（可选）</Label>
                <Textarea
                  id="genreDescription"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="专题类型的简短描述"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genreSortOrder">排序</Label>
                  <Input
                    id="genreSortOrder"
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                    />
                    <span className="text-sm">{form.is_active ? "启用" : "禁用"}</span>
                  </div>
                </div>
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
              确定要删除专题 <strong>{deletingGenre?.display_name}</strong>（{deletingGenre?.code}）吗？
              <span className="text-orange-600 block mt-2">
                删除后，关联该专题的模板将失去专题标记。
              </span>
            </>
          }
          loading={deleting}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
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
            <TableHead className="w-[100px]">代码</TableHead>
            <TableHead>显示名称</TableHead>
            <TableHead>描述</TableHead>
            <TableHead className="w-[80px]">排序</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[150px]">创建时间</TableHead>
            <TableHead className="w-[120px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
              <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
