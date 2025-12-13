import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "../types";

interface AiModifyPanelProps {
  modifyPrompt: string;
  setModifyPrompt: (value: string) => void;
  aiModifying: boolean;
  handleAIModify: () => void;
  panel: Panel;
}

export function AiModifyPanel({
  modifyPrompt,
  setModifyPrompt,
  aiModifying,
  handleAIModify,
  panel,
}: AiModifyPanelProps) {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div>
        <label className="text-sm font-medium block mb-2">修改描述</label>
        <Textarea
          placeholder="例如：把背景换成晴朗的天空，增加阳光效果"
          value={modifyPrompt}
          onChange={(e) => setModifyPrompt(e.target.value)}
          rows={4}
          disabled={aiModifying}
        />
        <p className="text-xs text-muted-foreground mt-2">以当前图片为参考，AI会根据你的描述进行修改</p>
      </div>

      <Button className="w-full" onClick={handleAIModify} disabled={aiModifying || !modifyPrompt.trim()}>
        {aiModifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI处理中...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            AI修改
          </>
        )}
      </Button>

      <div className="pt-4 border-t">
        <h3 className="text-sm font-medium mb-2">原始信息</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>画面描述：{panel.description || "无"}</p>
          {panel.dialogue && <p>对白：{panel.dialogue}</p>}
        </div>
      </div>
    </div>
  );
}
