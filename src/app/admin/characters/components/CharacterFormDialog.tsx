import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Character, CharacterFormData } from "../types";

type CharacterFormDialogProps = {
  open: boolean;
  editing: Character | null;
  form: CharacterFormData;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: CharacterFormData) => void;
  onSubmit: () => void;
};

export const CharacterFormDialog = ({
  open,
  editing,
  form,
  submitting,
  onOpenChange,
  onFormChange,
  onSubmit,
}: CharacterFormDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑角色" : "创建角色"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "修改角色基础信息与训练状态。"
              : "为指定用户创建角色，系统会自动创建默认服装。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>角色名称*</Label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange({ ...form, name: e.target.value })}
              placeholder="输入角色名"
            />
          </div>
          <div className="space-y-2">
            <Label>所属用户 ID{editing ? "（如需转移可修改）" : "*"}</Label>
            <Input
              value={form.user_id}
              disabled={!!editing && !form.user_id}
              onChange={(e) => onFormChange({ ...form, user_id: e.target.value })}
              placeholder="用户 UUID"
            />
          </div>
          <div className="space-y-2">
            <Label>训练状态</Label>
            <Select
              value={form.training_status}
              onValueChange={(val: Character["training_status"]) =>
                onFormChange({ ...form, training_status: val })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待训练</SelectItem>
                <SelectItem value="training">训练中</SelectItem>
                <SelectItem value="ready">可用</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>训练进度（0-100）</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.training_progress}
              onChange={(e) =>
                onFormChange({ ...form, training_progress: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>标签（逗号分隔）</Label>
            <Input
              value={form.tags}
              onChange={(e) => onFormChange({ ...form, tags: e.target.value })}
              placeholder="示例：女主角, 学生, 白发"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>描述</Label>
            <Textarea
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              rows={3}
              placeholder="角色背景或设定"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>基础提示词</Label>
            <Textarea
              value={form.base_prompt}
              onChange={(e) => onFormChange({ ...form, base_prompt: e.target.value })}
              rows={3}
              placeholder="生成角色时的基础提示词"
            />
          </div>
          <div className="space-y-2">
            <Label>基础形象 URL（可选）</Label>
            <Input
              value={form.base_image_url}
              onChange={(e) => onFormChange({ ...form, base_image_url: e.target.value })}
              placeholder="http(s)://..."
            />
          </div>
          <div className="space-y-2">
            <Label>LoRA 模型地址（可选）</Label>
            <Input
              value={form.lora_model_url}
              onChange={(e) => onFormChange({ ...form, lora_model_url: e.target.value })}
              placeholder="模型文件路径或下载链接"
            />
          </div>
          <div className="space-y-2">
            <Label>LoRA 触发词（可选）</Label>
            <Input
              value={form.lora_trigger_word}
              onChange={(e) => onFormChange({ ...form, lora_trigger_word: e.target.value })}
              placeholder="用于触发 LoRA 的关键词"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
