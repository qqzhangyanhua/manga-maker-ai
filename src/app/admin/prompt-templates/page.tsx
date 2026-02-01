"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  RotateCcw,
  Edit,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Search,
} from "lucide-react";
import { useAdminList } from "@/hooks/admin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { PromptTemplate, PromptTemplateFilter } from "./types";
import {
  FUNCTION_CODES,
  PHASE_OPTIONS,
  getPhaseLabel,
  getFunctionCodeLabel,
} from "./types";
import type { Genre } from "../genres/types";

/**
 * 提示词模板管理页面
 */
export default function PromptTemplatesPage() {
  const { toast } = useToast();
  const router = useRouter();

  // 专题列表（用于筛选）
  const [genres, setGenres] = useState<Genre[]>([]);

  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<PromptTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 使用通用列表 hook
  const {
    items: templates,
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
  } = useAdminList<PromptTemplate, PromptTemplateFilter>({
    endpoint: "/api/admin/prompt-templates",
    initialFilter: {},
    initialPageSize: 20,
  });

  // 获取专题列表
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch("/api/admin/genres?includeInactive=true");
        const result = await response.json();
        if (response.ok) {
          setGenres(result.data || []);
        }
      } catch (error) {
        console.error("获取专题列表失败:", error);
      }
    };
    fetchGenres();
  }, []);

  // 复制模板
  const handleDuplicate = async (template: PromptTemplate) => {
    try {
      const response = await fetch(`/api/admin/prompt-templates/${template.id}/duplicate`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "复制失败");
      }

      toast({ title: "复制成功" });
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "复制失败";
      toast({ title: message, variant: "destructive" });
    }
  };

  // 删除模板
  const handleDelete = async () => {
    if (!deletingTemplate) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/prompt-templates/${deletingTemplate.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast({ title: "删除成功" });
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
      refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <FileText className="w-12 h-12 text-primary drop-shadow-md" />
            提示词模板管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            管理 AI 工作流的提示词模板
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
            <div className="grid gap-4 md:grid-cols-5 flex-1 mr-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs">搜索</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="搜索名称或代码"
                    value={filter.search || ""}
                    onChange={(e) => setFilter({ ...filter, search: e.target.value || undefined })}
                    disabled={loading}
                    className="h-9 pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase" className="text-xs">阶段</Label>
                <Select
                  value={filter.phase || "all"}
                  onValueChange={(value) => setFilter({ ...filter, phase: value === "all" ? undefined : value })}
                  disabled={loading}
                >
                  <SelectTrigger id="phase" className="h-9">
                    <SelectValue placeholder="全部阶段" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部阶段</SelectItem>
                    {PHASE_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre" className="text-xs">专题</Label>
                <Select
                  value={filter.genre || "all"}
                  onValueChange={(value) => setFilter({ ...filter, genre: value === "all" ? undefined : value })}
                  disabled={loading}
                >
                  <SelectTrigger id="genre" className="h-9">
                    <SelectValue placeholder="全部专题" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部专题</SelectItem>
                    <SelectItem value="general">通用模板</SelectItem>
                    {genres.map((g) => (
                      <SelectItem key={g.id} value={g.display_name}>
                        {g.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="function_code" className="text-xs">功能代码</Label>
                <Select
                  value={filter.function_code || "all"}
                  onValueChange={(value) => setFilter({ ...filter, function_code: value === "all" ? undefined : value })}
                  disabled={loading}
                >
                  <SelectTrigger id="function_code" className="h-9">
                    <SelectValue placeholder="全部功能" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部功能</SelectItem>
                    {FUNCTION_CODES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">操作</Label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="includeInactive"
                      checked={filter.includeInactive || false}
                      onCheckedChange={(checked) => setFilter({ ...filter, includeInactive: checked || undefined })}
                    />
                    <Label htmlFor="includeInactive" className="text-xs">
                      显示禁用
                    </Label>
                  </div>
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
            </div>

            <Link href="/admin/prompt-templates/new">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建模板
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-5 comic-card bg-card overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : templates.length === 0 ? (
            <AdminEmptyState
              icon={<FileText className="h-12 w-12" />}
              title="暂无模板"
              description="当前筛选条件下没有找到任何模板"
              action={
                <Link href="/admin/prompt-templates/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    创建第一个模板
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead className="w-[100px]">阶段</TableHead>
                    <TableHead className="w-[80px]">专题</TableHead>
                    <TableHead className="w-[150px]">功能代码</TableHead>
                    <TableHead className="w-[80px]">使用次数</TableHead>
                    <TableHead className="w-[60px]">状态</TableHead>
                    <TableHead className="w-[140px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} className={!template.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {template.code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPhaseLabel(template.phase)}</Badge>
                      </TableCell>
                      <TableCell>
                        {template.genre ? (
                          <Badge variant="secondary">{template.genre}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">通用</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.function_code ? (
                          <span className="text-xs font-mono">{template.function_code}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>{template.usage_count}</TableCell>
                      <TableCell>
                        {template.is_active ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/admin/prompt-templates/${template.id}`)}
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDuplicate(template)}
                            title="复制"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              setDeletingTemplate(template);
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

        {/* 删除确认 */}
        <AdminDeleteDialog
          open={deleteDialogOpen}
          title="删除确认"
          description={
            <>
              确定要删除模板 <strong>{deletingTemplate?.name}</strong> 吗？
              {deletingTemplate && deletingTemplate.usage_count > 0 && (
                <span className="text-orange-600 block mt-2">
                  警告：该模板已被使用 {deletingTemplate.usage_count} 次。
                </span>
              )}
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
            <TableHead>名称</TableHead>
            <TableHead className="w-[100px]">阶段</TableHead>
            <TableHead className="w-[80px]">专题</TableHead>
            <TableHead className="w-[150px]">功能代码</TableHead>
            <TableHead className="w-[80px]">使用次数</TableHead>
            <TableHead className="w-[60px]">状态</TableHead>
            <TableHead className="w-[140px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[20px]" /></TableCell>
              <TableCell><Skeleton className="h-8 w-[80px]" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
