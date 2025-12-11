"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Plus } from "lucide-react";
import { useProviders } from "./hooks/useProviders";
import { ProviderTypeInfo } from "./components/ProviderTypeInfo";
import { ProviderTable } from "./components/ProviderTable";
import { ProviderFormDialog } from "./components/ProviderFormDialog";
import { DeleteProviderDialog } from "./components/DeleteProviderDialog";
import type { Provider } from "./types";

const AdminLlmProvidersPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null);

  const {
    providers,
    loading,
    saving,
    message,
    setMessage,
    fetchProviders,
    saveProvider,
    copyProvider,
    deleteProvider,
  } = useProviders();

  const isAdmin = useMemo(
    () => currentUser && (currentUser.role || "user") === "admin",
    [currentUser],
  );

  useEffect(() => {
    if (isAdmin) {
      fetchProviders();
    }
  }, [isAdmin, fetchProviders]);

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setMessage("");
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingProvider(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (form: Parameters<typeof saveProvider>[0]) => {
    const editingId = editingProvider?.id ?? null;
    return await saveProvider(form, editingId);
  };

  const handleCopy = async (provider: Provider) => {
    await copyProvider(provider);
  };

  const handleDelete = (provider: Provider) => {
    setDeletingProvider(provider);
  };

  const confirmDelete = async () => {
    if (!deletingProvider) return;
    await deleteProvider(deletingProvider.id);
    setDeletingProvider(null);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingProvider(null);
    }
  };

  if (userLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">模型配置管理</h1>
        <p>正在加载用户信息...</p>
      </div>
    );
  }

  if (userError || !currentUser) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">模型配置管理</h1>
        <p>请先登录后再访问本页面。</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">模型配置管理</h1>
        <p>当前账号权限不足，需要管理员角色。</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">模型配置管理</h1>
        <p className="text-muted-foreground">
          按 provider_type 归类的模型配置；调用前会按 type 查表并取优先级最高的记录。
        </p>
      </div>

      <ProviderTypeInfo />

      {message && (
        <div className="p-3 rounded-md bg-muted text-sm text-foreground border border-border">
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          新增配置
        </Button>
      </div>

      <ProviderTable
        providers={providers}
        loading={loading}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
      />

      <ProviderFormDialog
        open={dialogOpen}
        editingProvider={editingProvider}
        saving={saving}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <DeleteProviderDialog
        provider={deletingProvider}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminLlmProvidersPage;
