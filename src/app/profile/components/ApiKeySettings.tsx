"use client";

import { useState, useCallback, useEffect } from "react";
import { Key, Eye, EyeOff, Save, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserApiKey {
  id: string;
  provider: string;
  apiKey: string; // masked
  baseUrl?: string;
  createdAt: string;
}

const PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "fal", name: "FAL AI", placeholder: "fal-..." },
  { id: "google-imagen", name: "Google Imagen", placeholder: "AIza..." },
  { id: "seedream", name: "火山引擎 Seedream", placeholder: "..." },
  { id: "sd", name: "Stable Diffusion (自部署)", placeholder: "留空即可" },
];

export function ApiKeySettings() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newProvider, setNewProvider] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/user/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      // Ignore - API may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSave = async () => {
    if (!newProvider) {
      toast({
        title: "请填写完整",
        description: "请选择提供商",
        variant: "destructive",
      });
      return;
    }
    if (newProvider !== "sd" && !newApiKey) {
      toast({
        title: "请填写完整",
        description: "请选择提供商并填写 API Key",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newProvider,
          apiKey: newApiKey,
          baseUrl: newBaseUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }

      toast({ title: "API Key 已保存" });
      setNewProvider("");
      setNewApiKey("");
      setNewBaseUrl("");
      fetchKeys();
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除此 API Key 吗？")) return;

    try {
      const res = await fetch(`/api/user/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast({ title: "已删除" });
      fetchKeys();
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const providerInfo = PROVIDERS.find((p) => p.id === newProvider);
  const canSave = newProvider && (newProvider === "sd" || newApiKey);

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Key className="w-5 h-5 text-orange-400" />
        自有 API Key
      </h3>
      <p className="text-sm text-zinc-500 mb-6">
        配置您自己的 AI 服务商 API Key，使用自有配额生成图片
      </p>

      {/* Existing keys */}
      {keys.length > 0 && (
        <div className="space-y-2 mb-6">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
            >
              <div>
                <span className="text-sm font-medium text-zinc-200">
                  {PROVIDERS.find((p) => p.id === key.provider)?.name || key.provider}
                </span>
                <span className="text-xs text-zinc-500 ml-3">{key.apiKey}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(key.id)}
                className="text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new key */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-sm">提供商</Label>
            <Select value={newProvider} onValueChange={setNewProvider}>
              <SelectTrigger className="mt-1 bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="选择提供商" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-400 text-sm">API Key</Label>
            <div className="relative mt-1">
              <Input
                type={showKey ? "text" : "password"}
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={providerInfo?.placeholder || "输入 API Key"}
                className="bg-zinc-800/50 border-zinc-700 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {newProvider === "sd" && (
          <div>
            <Label className="text-zinc-400 text-sm">自部署地址 (Base URL)</Label>
            <Input
              value={newBaseUrl}
              onChange={(e) => setNewBaseUrl(e.target.value)}
              placeholder="http://localhost:7860"
              className="mt-1 bg-zinc-800/50 border-zinc-700"
            />
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          保存 API Key
        </Button>
      </div>

      <p className="text-xs text-zinc-600 mt-4">
        API Key 使用 AES-256 加密存储，仅用于您的个人图像生成请求。
      </p>
    </GlassCard>
  );
}
