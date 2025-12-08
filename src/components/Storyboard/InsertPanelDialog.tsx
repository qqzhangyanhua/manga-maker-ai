import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Sparkles } from "lucide-react";

interface InsertPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (description: string, useLLM: boolean) => void;
  insertAfterOrder: number | null;
}

const InsertPanelDialog = ({
  open,
  onOpenChange,
  onInsert,
  insertAfterOrder,
}: InsertPanelDialogProps) => {
  const [description, setDescription] = useState("");
  const [useLLM, setUseLLM] = useState(true);

  const handleSubmit = () => {
    if (!description.trim()) return;
    onInsert(description, useLLM);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            插入新分镜
          </DialogTitle>
          <DialogDescription>
            在分镜 {insertAfterOrder} 之后插入一个新的分镜。
            {useLLM
              ? "AI 将根据您的描述生成详细的分镜信息。"
              : "将直接使用您的描述创建分镜。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              分镜描述
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：一个过渡镜头，展示城市夜景..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useLLM"
              checked={useLLM}
              onChange={(e) => setUseLLM(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="useLLM" className="text-sm text-foreground cursor-pointer">
              <Sparkles className="w-3 h-3 inline mr-1" />
              使用 AI 优化分镜信息
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setDescription("");
              onOpenChange(false);
            }}
          >
            取消
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!description.trim()}
          >
            <Plus className="w-4 h-4" />
            插入分镜
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InsertPanelDialog;
