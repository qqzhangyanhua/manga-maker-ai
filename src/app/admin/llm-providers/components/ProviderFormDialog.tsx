import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProviderForm, Provider } from "../types";
import { emptyForm } from "../types";

interface ProviderFormDialogProps {
  open: boolean;
  editingProvider: Provider | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: ProviderForm) => Promise<boolean>;
}

export const ProviderFormDialog = ({
  open,
  editingProvider,
  saving,
  onOpenChange,
  onSubmit,
}: ProviderFormDialogProps) => {
  const [form, setForm] = useState<ProviderForm>(emptyForm);

  useEffect(() => {
    if (editingProvider) {
      setForm({
        provider_type: editingProvider.provider_type,
        provider_name: editingProvider.provider_name,
        model: editingProvider.model,
        base_url: editingProvider.base_url,
        api_key: editingProvider.api_key,
        priority: editingProvider.priority,
        enabled: editingProvider.enabled,
        desc: editingProvider.desc || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingProvider, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(form);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !saving) {
      setForm(emptyForm);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProvider ? "编辑配置" : "新增配置"}</DialogTitle>
          <DialogDescription>
            {editingProvider ? "修改模型配置信息" : "添加新的模型配置"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, priority: Number(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-2 flex items-center gap-3">
              <Label className="min-w-[80px]">enabled</Label>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>描述 (desc)</Label>
              <Input
                value={form.desc || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, desc: e.target.value }))}
                placeholder="描述这个配置是用来干嘛的"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中..." : editingProvider ? "更新配置" : "新增配置"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

