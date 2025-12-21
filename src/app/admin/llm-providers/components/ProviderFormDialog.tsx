import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import type { ProviderForm, Provider } from "../types";
import { emptyForm, KNOWN_PROVIDER_TYPES, CUSTOM_TYPE_VALUE } from "../types";

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
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCustomType, setIsCustomType] = useState(false);

  useEffect(() => {
    if (editingProvider) {
      const isKnownType = KNOWN_PROVIDER_TYPES.includes(editingProvider.provider_type as typeof KNOWN_PROVIDER_TYPES[number]);
      setIsCustomType(!isKnownType);
      setForm({
        provider_type: editingProvider.provider_type,
        provider_name: editingProvider.provider_name,
        model: editingProvider.model,
        base_url: editingProvider.base_url,
        api_key: editingProvider.api_key,
        priority: editingProvider.priority,
        enabled: editingProvider.enabled,
        desc: editingProvider.desc || "",
        credits_cost: editingProvider.credits_cost ?? 0,
      });
    } else {
      setForm(emptyForm);
      setIsCustomType(false);
    }
    setShowApiKey(false);
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
              <Select
                value={isCustomType ? CUSTOM_TYPE_VALUE : form.provider_type}
                onValueChange={(value) => {
                  if (value === CUSTOM_TYPE_VALUE) {
                    setIsCustomType(true);
                    setForm((prev) => ({ ...prev, provider_type: "" }));
                  } else {
                    setIsCustomType(false);
                    setForm((prev) => ({ ...prev, provider_type: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_PROVIDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_TYPE_VALUE}>自定义类型...</SelectItem>
                </SelectContent>
              </Select>
              {isCustomType && (
                <Input
                  value={form.provider_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, provider_type: e.target.value }))}
                  placeholder="输入自定义类型"
                  required
                  className="mt-2"
                />
              )}
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
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={form.api_key}
                  onChange={(e) => setForm((prev) => ({ ...prev, api_key: e.target.value }))}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
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
            <div className="space-y-2">
              <Label>算力消耗 (credits_cost)</Label>
              <Input
                type="number"
                min={0}
                value={form.credits_cost}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, credits_cost: Number(e.target.value) || 0 }))
                }
                placeholder="0 = 免费"
              />
              <p className="text-xs text-muted-foreground">每次调用消耗的算力，0表示不消耗</p>
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














