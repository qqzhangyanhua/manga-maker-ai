import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Provider, ProviderForm } from "../types";

export const useProviders = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchProvidersRef = useRef(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/llm-providers", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "获取列表失败");
      }
      const data = await res.json();
      setProviders(data.data.providers as Provider[]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "获取失败",
        description: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  });

  const fetchProviders = useCallback(async () => {
    await fetchProvidersRef.current();
  }, []);

  const saveProvider = useCallback(async (form: ProviderForm, editingId: number | null) => {
    setSaving(true);

    const payload = {
      ...form,
      priority: Number(form.priority) || 1,
    };

    try {
      const res = await fetch(
        editingId ? `/api/llm-providers/${editingId}` : "/api/llm-providers",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = data.message || data.error || `保存失败 (${res.status})`;
        console.error("保存失败:", data);
        throw new Error(errorMsg);
      }

      toast({
        title: "保存成功",
        description: editingId ? "配置已更新" : "配置已创建",
      });
      await fetchProvidersRef.current();
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: (error as Error).message,
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const copyProvider = useCallback(async (provider: Provider) => {
    try {
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "复制失败");
      }

      toast({
        title: "复制成功",
        description: "新配置已创建（默认禁用）",
      });
      await fetchProvidersRef.current();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: (error as Error).message,
      });
    }
  }, [toast]);

  const deleteProvider = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/llm-providers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "删除失败");
      }
      toast({
        title: "删除成功",
        description: "配置已删除",
      });
      await fetchProvidersRef.current();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: (error as Error).message,
      });
    }
  }, [toast]);

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









