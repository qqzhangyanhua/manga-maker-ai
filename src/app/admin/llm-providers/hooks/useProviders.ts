import { useState, useCallback, useRef } from "react";
import type { Provider, ProviderForm } from "../types";

export const useProviders = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const fetchProvidersRef = useRef(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/llm-providers", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "获取列表失败");
      }
      const data = await res.json();
      setProviders(data.data.providers as Provider[]);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  });

  const fetchProviders = useCallback(async () => {
    await fetchProvidersRef.current();
  }, []);

  const saveProvider = useCallback(async (form: ProviderForm, editingId: number | null) => {
    setSaving(true);
    setMessage("");

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

      setMessage("保存成功");
      await fetchProvidersRef.current();
      return true;
    } catch (error) {
      setMessage((error as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const copyProvider = useCallback(async (provider: Provider) => {
    setMessage("");
    try {
      const payload = {
        provider_type: provider.provider_type,
        provider_name: provider.provider_name,
        model: provider.model,
        base_url: provider.base_url,
        api_key: provider.api_key,
        priority: provider.priority,
        enabled: false, // 复制后默认关闭
        desc: provider.desc,
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

      setMessage("复制成功（已默认关闭）");
      await fetchProvidersRef.current();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, []);

  const deleteProvider = useCallback(async (id: number) => {
    setMessage("");
    try {
      const res = await fetch(`/api/llm-providers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "删除失败");
      }
      setMessage("删除成功");
      await fetchProvidersRef.current();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, []);

  return {
    providers,
    loading,
    saving,
    message,
    setMessage,
    fetchProviders,
    saveProvider,
    copyProvider,
    deleteProvider,
  };
};
