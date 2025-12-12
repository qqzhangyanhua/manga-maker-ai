"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Filters, Character } from "./types";
import { useCharacterList } from "./hooks/useCharacterList";
import { useCharacterForm } from "./hooks/useCharacterForm";
import { CharacterFilterBar } from "./components/CharacterFilterBar";
import { CharacterTable } from "./components/CharacterTable";
import { CharacterFormDialog } from "./components/CharacterFormDialog";
import { DeleteConfirmDialog } from "./components/DeleteConfirmDialog";
import { PaginationControls } from "./components/PaginationControls";

const AdminCharactersPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const { toast } = useToast();
  const isAdmin = useMemo(() => (currentUser?.role || "user") === "admin", [currentUser]);

  const [filters, setFilters] = useState<Filters>({ keyword: "", userId: "", status: "all" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [deletingCharacter, setDeletingCharacter] = useState<Character | null>(null);

  const {
    characters,
    userMap,
    loading,
    total,
    currentPage,
    fetchCharacters,
  } = useCharacterList(filters, page, pageSize);

  const {
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setForm,
    submitting,
    resetForm,
    openCreateDialog,
    openEditDialog,
    handleSubmit,
  } = useCharacterForm(() => fetchCharacters());

  useEffect(() => {
    if (isAdmin) fetchCharacters();
  }, [isAdmin, fetchCharacters]);

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

  const handleDelete = (character: Character) => {
    setDeletingCharacter(character);
  };

  const confirmDelete = async () => {
    if (!deletingCharacter) return;
    try {
      const res = await fetch(`/api/admin/characters/${deletingCharacter.id}`, {
        method: "DELETE",
      });
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

        <CharacterFilterBar
          filters={filters}
          loading={loading}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
        />

        <CharacterTable
          characters={characters}
          userMap={userMap}
          loading={loading}
          onEdit={openEditDialog}
          onDelete={handleDelete}
        />

        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          total={total}
          onPageChange={handlePageChange}
        />
      </div>

      <CharacterFormDialog
        open={dialogOpen}
        editing={editing}
        form={form}
        submitting={submitting}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        onFormChange={setForm}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        character={deletingCharacter}
        onOpenChange={(open) => !open && setDeletingCharacter(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminCharactersPage;
