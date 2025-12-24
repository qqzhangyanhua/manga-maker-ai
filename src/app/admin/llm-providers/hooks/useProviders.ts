import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Provider, ProviderForm } from "../types";

const PROVIDERS_QUERY_KEY = ["admin-llm-providers"];

export const useProviders = () => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch providers using React Query
  const {
    data: providers = [],
    isLoading: loading,
    refetch: fetchProviders,
  } = useQuery({
    queryKey: PROVIDERS_QUERY_KEY,
    queryFn: async (): Promise<Provider[]> => {
      const res = await fetch("/api/llm-providers", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "获取列表失败" }));
        throw new Error(data.message || "获取列表失败");
      }
      const data = await res.json();
      return data.data.providers as Provider[];
    },
    staleTime: 30 * 1000, // 30 seconds cache
    retry: 1,
  });

  // Save provider mutation
  const saveProviderMutation = useMutation({
    mutationFn: async ({
      form,
      editingId,
    }: {
      form: ProviderForm;
      editingId: number | null;
    }): Promise<boolean> => {
      const payload = {
        ...form,
        priority: Number(form.priority) || 1,
      };

      const res = await fetch(
        editingId ? `/api/llm-providers/${editingId}` : "/api/llm-providers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({ message: "保存失败" }));
      if (!res.ok) {
        const errorMsg = data.message || data.error || `保存失败 (${res.status})`;
        throw new Error(errorMsg);
      }

      return true;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "保存成功",
        description: variables.editingId ? "配置已更新" : "配置已创建",
      });
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error.message,
      });
    },
  });

  // Copy provider mutation
  const copyProviderMutation = useMutation({
    mutationFn: async (provider: Provider) => {
      const payload = {
        provider_type: provider.provider_type,
        provider_name: provider.provider_name,
        model: provider.model,
        base_url: provider.base_url,
        api_key: provider.api_key,
        priority: provider.priority,
        enabled: false,
        desc: provider.desc,
        credits_cost: provider.credits_cost,
      };

      const res = await fetch("/api/llm-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({ message: "复制失败" }));
      if (!res.ok) {
        throw new Error(data.message || "复制失败");
      }
    },
    onSuccess: () => {
      toast({
        title: "复制成功",
        description: "新配置已创建（默认禁用）",
      });
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: error.message,
      });
    },
  });

  // Delete provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/llm-providers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({ message: "删除失败" }));
      if (!res.ok) {
        throw new Error(data.message || "删除失败");
      }
    },
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "配置已删除",
      });
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: error.message,
      });
    },
  });

  const saveProvider = useCallback(
    async (form: ProviderForm, editingId: number | null): Promise<boolean> => {
      setSaving(true);
      try {
        await saveProviderMutation.mutateAsync({ form, editingId });
        return true;
      } catch (error) {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [saveProviderMutation]
  );

  const copyProvider = useCallback(
    async (provider: Provider) => {
      await copyProviderMutation.mutateAsync(provider);
    },
    [copyProviderMutation]
  );

  const deleteProvider = useCallback(
    async (id: number) => {
      await deleteProviderMutation.mutateAsync(id);
    },
    [deleteProviderMutation]
  );

  return {
    providers,
    loading,
    saving,
    fetchProviders,
    saveProvider,
    copyProvider,
    deleteProvider,
  };
};







