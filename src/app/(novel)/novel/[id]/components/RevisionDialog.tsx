"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wand2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface RevisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onReplace: (newText: string) => void;
}

export function RevisionDialog({
  isOpen,
  onClose,
  selectedText,
  onReplace,
}: RevisionDialogProps) {
  const [instruction, setInstruction] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [isRevising, setIsRevising] = useState(false);
  const [hasRevised, setHasRevised] = useState(false);

  const handleRevise = async () => {
    if (!instruction.trim()) {
      toast.error("请输入修改指令");
      return;
    }

    setIsRevising(true);
    setRevisedText("");
    setHasRevised(false);

    try {
      const response = await fetch("/api/novel/chapters/revise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          original_content: selectedText,
          revision_instruction: instruction,
        }),
      });

      if (!response.ok) {
        throw new Error("修订失败");
      }

      // 流式读取响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data === "[DONE]") {
                setHasRevised(true);
                break;
              } else if (data.startsWith("[ERROR:")) {
                throw new Error(data);
              } else {
                accumulated += data;
                setRevisedText(accumulated);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("修订失败:", error);
      toast.error("修订失败，请重试");
    } finally {
      setIsRevising(false);
    }
  };

  const handleReplace = () => {
    if (revisedText) {
      onReplace(revisedText);
      toast.success("已替换选中内容");
      handleClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(revisedText);
    toast.success("已复制到剪贴板");
  };

  const handleClose = () => {
    setInstruction("");
    setRevisedText("");
    setHasRevised(false);
    onClose();
  };

  // 快捷指令
  const quickInstructions = [
    "优化语言，使其更生动",
    "增加细节描写",
    "修正语法错误",
    "改为第一人称视角",
    "使语气更轻松",
    "增加对话内容",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            AI 内容修订
          </DialogTitle>
          <DialogDescription>
            选中内容将被 AI 根据您的指令进行改写
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 原文 */}
          <div>
            <Label className="text-sm font-medium">选中的内容</Label>
            <div className="mt-2 rounded-md border bg-muted p-3">
              <p className="text-sm whitespace-pre-wrap line-clamp-6">
                {selectedText}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedText.length} 字
                </Badge>
              </div>
            </div>
          </div>

          {/* 修改指令 */}
          <div>
            <Label htmlFor="instruction" className="text-sm font-medium">
              修改指令
            </Label>
            <Textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="例如：优化语言，使其更生动；增加细节描写；修正语法错误等..."
              rows={3}
              className="mt-2"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {quickInstructions.map((instr, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setInstruction(instr)}
                >
                  {instr}
                </Badge>
              ))}
            </div>
          </div>

          {/* AI 修订结果 */}
          {(isRevising || revisedText) && (
            <div>
              <Label className="text-sm font-medium">修订结果</Label>
              <div className="mt-2 rounded-md border p-3 bg-background">
                {isRevising ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>AI 正在改写中...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">
                      {revisedText || "等待 AI 生成..."}
                    </p>
                    {revisedText && (
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {revisedText.length} 字
                        </Badge>
                        {hasRevised && (
                          <Badge variant="default" className="text-xs">
                            <Check className="mr-1 h-3 w-3" />
                            生成完成
                          </Badge>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <div className="flex gap-2">
            {revisedText && (
              <>
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  复制
                </Button>
                <Button onClick={handleReplace} disabled={!hasRevised}>
                  <Check className="mr-2 h-4 w-4" />
                  替换原文
                </Button>
              </>
            )}
            {!revisedText && (
              <Button onClick={handleRevise} disabled={isRevising}>
                <Wand2 className="mr-2 h-4 w-4" />
                {isRevising ? "生成中..." : "开始修订"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
