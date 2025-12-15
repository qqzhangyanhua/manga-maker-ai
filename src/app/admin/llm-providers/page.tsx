"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/toaster";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Plus, Search } from "lucide-react";
import { useProviders } from "./hooks/useProviders";
import { ProviderTypeInfo } from "./components/ProviderTypeInfo";
import { ProviderTable } from "./components/ProviderTable";
import { ProviderFormDialog } from "./components/ProviderFormDialog";
import { DeleteProviderDialog } from "./components/DeleteProviderDialog";
import type { Provider } from "./types";
import { KNOWN_PROVIDER_TYPES } from "./types";

const AdminLlmProvidersPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const {
    providers,
    loading,
    saving,
    fetchProviders,
    saveProvider,
    copyProvider,
    deleteProvider,
  } = useProviders();

  const isAdmin = useMemo(
    () => currentUser && (currentUser.role || "user") === "admin",
    [currentUser],
  );

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const matchesSearch =
        searchQuery === "" ||
        provider.provider_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && provider.enabled) ||
        (statusFilter === "disabled" && !provider.enabled);

      const matchesType =
        typeFilter === "all" || provider.provider_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [providers, searchQuery, statusFilter, typeFilter]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(providers.map((p) => p.provider_type));
    return Array.from(types).sort();
  }, [providers]);

  useEffect(() => {
    if (isAdmin) {
      fetchProviders();
    }
  }, [isAdmin, fetchProviders]);

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
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

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索 Type、Name、Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: "all" | "enabled" | "disabled") => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="enabled">已启用</SelectItem>
              <SelectItem value="disabled">已禁用</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAddNew} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          新增配置
        </Button>
      </div>

      <ProviderTable
        providers={filteredProviders}
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

      <Toaster />
    </div>
  );
};

export default AdminLlmProvidersPage;
