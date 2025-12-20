"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, ArrowLeft, Users } from "lucide-react";
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
  const queryClient = useQueryClient();
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
    setFilter,
    setPage: setQueryPage,
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const res = await fetch(`/api/admin/characters/${characterId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "删除失败");
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "删除成功" });
      queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/admin/characters"] });
      setDeletingCharacter(null);
    },
    onError: (error: Error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setPage(1); // Reset page state to 1
    setQueryPage(1); // Update query page
    setFilter(filters); // Apply filters to query
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    setQueryPage(nextPage);
  };

  const handleDelete = (character: Character) => {
    setDeletingCharacter(character);
  };

  const confirmDelete = () => {
    if (!deletingCharacter) return;
    deleteMutation.mutate(deletingCharacter.id);
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
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <Users className="w-12 h-12 text-primary drop-shadow-md" />
            角色管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            查看所有用户的角色，并支持创建、编辑、删除。可按关键词或用户ID筛选。
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
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchCharacters()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>
            <Button
              size="sm"
              onClick={openCreateDialog}
              className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增角色
            </Button>
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
        deleting={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeletingCharacter(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminCharactersPage;
