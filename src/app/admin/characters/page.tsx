"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

type Character = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  base_prompt: string;
  tags: string[];
  base_image_url: string | null;
  lora_model_url: string | null;
  lora_trigger_word: string | null;
  training_status: "pending" | "training" | "ready" | "failed";
  training_progress: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

type UserMeta = {
  email: string;
  name: string | null;
};

type Filters = {
  keyword: string;
  userId: string;
  status: "all" | Character["training_status"];
};

const emptyForm = {
  user_id: "",
  name: "",
  description: "",
  base_prompt: "",
  base_image_url: "",
  lora_model_url: "",
  lora_trigger_word: "",
  tags: "",
  training_status: "pending" as Character["training_status"],
  training_progress: 0,
};

const statusLabel: Record<Character["training_status"], string> = {
  pending: "待训练",
  training: "训练中",
  ready: "可用",
  failed: "失败",
};

const AdminCharactersPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const { toast } = useToast();
  const isAdmin = useMemo(() => (currentUser?.role || "user") === "admin", [currentUser]);

  const [filters, setFilters] = useState<Filters>({ keyword: "", userId: "", status: "all" });
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserMeta>>({});
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [deletingCharacter, setDeletingCharacter] = useState<Character | null>(null);

  const fetchCharacters = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
      if (filters.userId.trim()) params.set("userId", filters.userId.trim());
      if (filters.status !== "all") params.set("status", filters.status);
      params.set("limit", String(targetPageSize));
      params.set("page", String(targetPage));

      const res = await fetch(`/api/admin/characters?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "获取角色列表失败");
      }
      setCharacters(data.data.characters as Character[]);
      setUserMap(data.data.userMap || {});
      setTotal(data.data.total || 0);
      setPage(data.data.page || targetPage);
      setPageSize(data.data.pageSize || targetPageSize);
    } catch (error) {
      toast({
        title: "获取失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchCharacters();
  }, [isAdmin]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
  };

  const handleSearch = () => {
    const nextPage = 1;
    setPage(nextPage);
    fetchCharacters(nextPage, pageSize);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    fetchCharacters(nextPage, pageSize);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (character: Character) => {
    setEditing(character);
    setForm({
      user_id: character.user_id,
      name: character.name,
      description: character.description || "",
      base_prompt: character.base_prompt || "",
      base_image_url: character.base_image_url || "",
      lora_model_url: character.lora_model_url || "",
      lora_trigger_word: character.lora_trigger_word || "",
      tags: (character.tags || []).join(", "),
      training_status: character.training_status,
      training_progress: character.training_progress ?? 0,
    });
    setDialogOpen(true);
  };

  const buildPayload = (forUpdate: boolean) => {
    const tagList = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const baseImageUrl = form.base_image_url.trim();
    const loraModelUrl = form.lora_model_url.trim();
    const loraTriggerWord = form.lora_trigger_word.trim();

    const payload: any = {
      user_id: form.user_id.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      base_prompt: form.base_prompt.trim() || undefined,
      tags: tagList,
      training_status: form.training_status,
    };

    if (forUpdate) {
      payload.base_image_url = baseImageUrl || null;
      payload.lora_model_url = loraModelUrl || null;
      payload.lora_trigger_word = loraTriggerWord || null;
    } else {
      if (baseImageUrl) payload.base_image_url = baseImageUrl;
      if (loraModelUrl) payload.lora_model_url = loraModelUrl;
      if (loraTriggerWord) payload.lora_trigger_word = loraTriggerWord;
    }

    const progress = Number(form.training_progress);
    if (!Number.isNaN(progress)) {
      payload.training_progress = progress;
    }

    if (!forUpdate && !payload.tags?.length) delete payload.tags;
    if (!forUpdate) {
      if (!payload.base_image_url) delete payload.base_image_url;
      if (!payload.lora_model_url) delete payload.lora_model_url;
      if (!payload.lora_trigger_word) delete payload.lora_trigger_word;
    }

    return payload;
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "角色名称不能为空", variant: "destructive" });
      return;
    }
    if (!editing && !form.user_id.trim()) {
      toast({ title: "创建时需要指定用户ID", variant: "destructive" });
      return;
    }

    const payload = buildPayload(!!editing);
    if (editing && !payload.user_id) {
      delete payload.user_id;
    }

    try {
      setSubmitting(true);
      const url = editing ? `/api/admin/characters/${editing.id}` : "/api/admin/characters";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "保存失败");
      }
      toast({ title: editing ? "更新成功" : "创建成功" });
      setDialogOpen(false);
      fetchCharacters();
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (character: Character) => {
    setDeletingCharacter(character);
  };

  const confirmDelete = async () => {
    if (!deletingCharacter) return;
    try {
      const res = await fetch(`/api/admin/characters/${deletingCharacter.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "删除失败");
      }
      toast({ title: "删除成功" });
      fetchCharacters();
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setDeletingCharacter(null);
    }
  };

  if (userLoading) {
    return <div className="p-10">正在加载用户信息...</div>;
  }

  if (userError || !currentUser) {
    return <div className="p-10">请先登录后访问本页面。</div>;
  }

  if (!isAdmin) {
    return <div className="p-10">当前账号权限不足，需要管理员角色。</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回后台
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchCharacters()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              新增角色
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">角色管理</h1>
          <p className="text-muted-foreground text-sm">
            查看所有用户的角色，并支持创建、编辑、删除。可按关键词或用户ID筛选。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg bg-card">
          <div className="space-y-2">
            <Label>关键词（名称/描述/提示词）</Label>
            <Input
              placeholder="模糊搜索"
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>用户 ID</Label>
            <Input
              placeholder="指定用户"
              value={filters.userId}
              onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>训练状态</Label>
            <Select
              value={filters.status}
              onValueChange={(val: Filters["status"]) => setFilters((prev) => ({ ...prev, status: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待训练</SelectItem>
                <SelectItem value="training">训练中</SelectItem>
                <SelectItem value="ready">可用</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button className="w-full" onClick={handleSearch} disabled={loading}>
              查询
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色名称</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-32 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    正在加载...
                  </TableCell>
                </TableRow>
              )}
              {!loading && characters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                characters.map((character) => {
                  const user = userMap[character.user_id];
                  return (
                    <TableRow key={character.id}>
                      <TableCell>
                        <div className="font-medium">{character.name}</div>
                        {character.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{character.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{user?.email || "未知用户"}</div>
                        <div className="text-xs text-muted-foreground">{user?.name || character.user_id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{statusLabel[character.training_status]}</div>
                        <div className="text-xs text-muted-foreground">
                          进度 {character.training_progress ?? 0}%
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {character.tags?.length ? character.tags.join("，") : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(character.created_at).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(character)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(character)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {total} 条，当前第 {page} / {totalPages} 页
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(page - 1);
                  }}
                />
              </PaginationItem>
              {getPageNumbers().map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(p);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑角色" : "创建角色"}</DialogTitle>
            <DialogDescription>
              {editing ? "修改角色基础信息与训练状态。" : "为指定用户创建角色，系统会自动创建默认服装。"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>角色名称*</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="输入角色名"
              />
            </div>
            <div className="space-y-2">
              <Label>所属用户 ID{editing ? "（如需转移可修改）" : "*"}</Label>
              <Input
                value={form.user_id}
                disabled={!!editing && !form.user_id}
                onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
                placeholder="用户 UUID"
              />
            </div>
            <div className="space-y-2">
              <Label>训练状态</Label>
              <Select
                value={form.training_status}
                onValueChange={(val: Character["training_status"]) =>
                  setForm((prev) => ({ ...prev, training_status: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待训练</SelectItem>
                  <SelectItem value="training">训练中</SelectItem>
                  <SelectItem value="ready">可用</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>训练进度（0-100）</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.training_progress}
                onChange={(e) => setForm((prev) => ({ ...prev, training_progress: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>标签（逗号分隔）</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="示例：女主角, 学生, 白发"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>描述</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="角色背景或设定"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>基础提示词</Label>
              <Textarea
                value={form.base_prompt}
                onChange={(e) => setForm((prev) => ({ ...prev, base_prompt: e.target.value }))}
                rows={3}
                placeholder="生成角色时的基础提示词"
              />
            </div>
            <div className="space-y-2">
              <Label>基础形象 URL（可选）</Label>
              <Input
                value={form.base_image_url}
                onChange={(e) => setForm((prev) => ({ ...prev, base_image_url: e.target.value }))}
                placeholder="http(s)://..."
              />
            </div>
            <div className="space-y-2">
              <Label>LoRA 模型地址（可选）</Label>
              <Input
                value={form.lora_model_url}
                onChange={(e) => setForm((prev) => ({ ...prev, lora_model_url: e.target.value }))}
                placeholder="模型文件路径或下载链接"
              />
            </div>
            <div className="space-y-2">
              <Label>LoRA 触发词（可选）</Label>
              <Input
                value={form.lora_trigger_word}
                onChange={(e) => setForm((prev) => ({ ...prev, lora_trigger_word: e.target.value }))}
                placeholder="用于触发 LoRA 的关键词"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCharacter} onOpenChange={(open) => !open && setDeletingCharacter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCharacter && (
                <>
                  确定删除角色「<strong>{deletingCharacter.name}</strong>」吗？
                  <br />
                  此操作不可恢复。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCharactersPage;
