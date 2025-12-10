"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Pencil, Copy, Trash2 } from "lucide-react";

type ProviderForm = {
  provider_type: string;
  provider_name: string;
  model: string;
  base_url: string;
  api_key: string;
  priority: number;
  enabled: boolean;
};

type Provider = ProviderForm & {
  id: number;
};

const emptyForm: ProviderForm = {
  provider_type: "",
  provider_name: "openai",
  model: "",
  base_url: "https://api.openai.com",
  api_key: "",
  priority: 1,
  enabled: true,
};

const AdminLlmProvidersPage = () => {
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProviderForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  const isAdmin = useMemo(
    () => currentUser && (currentUser.role || "user") === "admin",
    [currentUser],
  );

  const fetchProviders = async () => {
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
  };

  useEffect(() => {
    if (isAdmin) {
      fetchProviders();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        throw new Error(data.message || "保存失败");
      }

      setMessage("保存成功");
      resetForm();
      fetchProviders();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (provider: Provider) => {
    setEditingId(provider.id);
    setForm({
      provider_type: provider.provider_type,
      provider_name: provider.provider_name,
      model: provider.model,
      base_url: provider.base_url,
      api_key: provider.api_key,
      priority: provider.priority,
      enabled: provider.enabled,
    });
    setMessage("");
  };

  const handleCopy = async (provider: Provider) => {
    setMessage("");
    try {
      // 复制配置，但设置 enabled 为 false
      const payload = {
        provider_type: provider.provider_type,
        provider_name: provider.provider_name,
        model: provider.model,
        base_url: provider.base_url,
        api_key: provider.api_key,
        priority: provider.priority,
        enabled: false, // 复制后默认关闭
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
      fetchProviders();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该模型配置吗？")) return;
    setMessage("");
    try {
      const res = await fetch(`/api/llm-providers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "删除失败");
      }
      setMessage("删除成功");
      fetchProviders();
    } catch (error) {
      setMessage((error as Error).message);
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

      {/* Provider Type 说明 */}
      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
          📋 系统已知的 provider_type 类型：
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <strong className="text-blue-900 dark:text-blue-100">storyboard</strong>
              <p className="text-xs mt-1">用于分镜相关功能和提示词生成：剧本分析、分镜生成、分镜合并/拆分/插入、角色三视图/表情/装扮的 prompt 生成</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/storyboard, /api/panel/merge, /api/panel/split, /api/panel/insert,
                /api/character/generate-views (promptProviderType), /api/character/generate-expressions (promptProviderType), /api/character/outfits (promptProviderType)
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">story_generator</strong>
              <p className="text-xs mt-1">用于故事生成系统：从创意前提生成完整故事大纲、扩展故事章节、设定角色关系等</p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                <strong>使用位置：</strong><br/>
                • /api/story/generate - 根据创意前提（premise）生成完整故事大纲<br/>
                • /api/story/expand - 扩展指定章节的详细内容<br/>
                • /api/story/character-setup - 生成角色性格、背景、关系设定
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">workflow</strong>
              <p className="text-xs mt-1">用于自动化工作流：从剧本到完整漫画的端到端自动生成</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/workflow/auto-generate
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">image_generation</strong>
              <p className="text-xs mt-1">用于通用 AI 图像生成：分镜图片、角色生成等（无特殊要求时使用）</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/panel/generate-image, /api/character/generate-similar, /api/character/outfits/[id]/generate
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">image_generation_turnaround</strong>
              <p className="text-xs mt-1">三视图专用：为角色三视图（前、侧、后）生成配置独立的模型</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/character/generate-views (默认 imageProviderType)
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">image_generation_expression</strong>
              <p className="text-xs mt-1">表情专用：角色表情矩阵（9种情绪）的专用模型配置</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/character/generate-expressions (默认 imageProviderType)
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">image_generation_outfit</strong>
              <p className="text-xs mt-1">服装专用：角色换装生成的专用模型配置</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/character/outfits (默认 imageProviderType)
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">prompt_optimizer</strong>
              <p className="text-xs mt-1">用于提示词优化：增强和优化用户输入的提示词质量</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/prompt/optimize
              </p>
            </div>
            <div>
              <strong className="text-blue-900 dark:text-blue-100">character_analyzer</strong>
              <p className="text-xs mt-1">用于角色分析：分析角色特征并生成相似角色变体</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                使用位置：/api/character/generate-similar
              </p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-muted text-sm text-foreground border border-border">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border border-border bg-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>provider_type*</Label>
            <Input
              value={form.provider_type}
              onChange={(e) => setForm((prev) => ({ ...prev, provider_type: e.target.value }))}
              placeholder="如：storyboard"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>provider_name</Label>
            <Input
              value={form.provider_name}
              onChange={(e) => setForm((prev) => ({ ...prev, provider_name: e.target.value }))}
              placeholder="openai / azure / others"
            />
          </div>
          <div className="space-y-2">
            <Label>model*</Label>
            <Input
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              placeholder="如：gpt-4o-mini"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>base_url*</Label>
            <Input
              value={form.base_url}
              onChange={(e) => setForm((prev) => ({ ...prev, base_url: e.target.value }))}
              placeholder="https://api.openai.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>api_key</Label>
            <Input
              value={form.api_key}
              onChange={(e) => setForm((prev) => ({ ...prev, api_key: e.target.value }))}
              placeholder="sk-..."
            />
          </div>
          <div className="space-y-2">
            <Label>priority</Label>
            <Input
              type="number"
              min={1}
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: Number(e.target.value) || 1 }))}
            />
          </div>
          <div className="space-y-2 flex items-center gap-3">
            <Label className="min-w-[80px]">enabled</Label>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "保存中..." : editingId ? "更新配置" : "新增配置"}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              取消编辑
            </Button>
          )}
        </div>
      </form>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-left">Base URL</th>
                <th className="px-3 py-2 text-left">Priority</th>
                <th className="px-3 py-2 text-left">Enabled</th>
                <th className="px-3 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3" colSpan={8}>
                    正在加载...
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td className="px-3 py-3" colSpan={8}>
                    暂无配置，先在上方添加一条记录。
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2">{p.id}</td>
                    <td className="px-3 py-2">{p.provider_type}</td>
                    <td className="px-3 py-2">{p.provider_name}</td>
                    <td className="px-3 py-2">{p.model}</td>
                    <td className="px-3 py-2">{p.base_url}</td>
                    <td className="px-3 py-2">{p.priority}</td>
                    <td className="px-3 py-2">{p.enabled ? "是" : "否"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(p)}
                          title="编辑"
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopy(p)}
                          title="复制"
                          className="h-8 w-8"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(p.id)}
                          title="删除"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLlmProvidersPage;
