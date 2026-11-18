"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Plus, FileText, BookText, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SmartImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = "choose" | "import-text" | "importing";

const CREATION_PATHS = [
  {
    id: "scratch" as const,
    icon: Plus,
    title: "从零创作",
    description: "输入创意想法，AI 帮你生成完整的漫画故事和分镜",
    gradient: "from-orange-500/20 to-orange-600/10",
    iconColor: "text-orange-400",
    borderHover: "hover:border-orange-500/50",
  },
  {
    id: "import" as const,
    icon: FileText,
    title: "导入文本",
    description: "粘贴已有的故事文本，AI 自动识别章节并生成分镜",
    gradient: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderHover: "hover:border-blue-500/50",
  },
  {
    id: "novel" as const,
    icon: BookText,
    title: "从小说转换",
    description: "将小说项目中的章节转换为漫画作品",
    gradient: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-400",
    borderHover: "hover:border-purple-500/50",
  },
];

export function SmartImportWizard({ open, onOpenChange }: SmartImportWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("choose");
  const [importText, setImportText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePathSelect = (pathId: string) => {
    switch (pathId) {
      case "scratch":
        onOpenChange(false);
        router.push("/story");
        break;
      case "import":
        setStep("import-text");
        break;
      case "novel":
        onOpenChange(false);
        router.push("/novel");
        break;
    }
  };

  const handleImportSubmit = async () => {
    if (!importText.trim() || importText.trim().length < 20) {
      toast({
        title: "文本太短",
        description: "请输入至少 20 个字的故事文本",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: importText.slice(0, 30).replace(/\n/g, " "),
          premise: importText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建失败");
      }

      const data = await res.json();
      const projectId: string | undefined = data.projectId;
      if (!projectId) {
        throw new Error("创建项目失败：未返回有效 ID");
      }

      toast({
        title: "作品已创建",
        description: "正在跳转到编辑页面...",
      });

      onOpenChange(false);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep("choose");
      setImportText("");
      setIsSubmitting(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {step === "choose" ? "创建新作品" : "导入文本"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "choose"
              ? "选择一种方式开始创作"
              : "粘贴故事文本，AI 将帮你生成分镜"}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3 mt-2">
            {CREATION_PATHS.map((path) => {
              const IconComponent = path.icon;
              return (
                <button
                  key={path.id}
                  onClick={() => handlePathSelect(path.id)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50",
                    "transition-all duration-200 text-left",
                    path.borderHover,
                    "hover:bg-zinc-800/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                      path.gradient
                    )}
                  >
                    <IconComponent className={cn("w-5 h-5", path.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white mb-0.5">{path.title}</h4>
                    <p className="text-sm text-zinc-500">{path.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-2" />
                </button>
              );
            })}
          </div>
        )}

        {step === "import-text" && (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-zinc-300 mb-2 block">故事文本</Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="在此粘贴你的故事内容...&#10;&#10;AI 将自动识别情节，生成对应的漫画分镜。"
                className="min-h-[200px] bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 resize-none"
              />
              <p className="text-xs text-zinc-600 mt-1">
                {importText.length} 字 · 建议 200 字以上以获得更好效果
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep("choose")}
                className="text-zinc-400"
              >
                返回
              </Button>
              <Button
                onClick={handleImportSubmit}
                disabled={isSubmitting || importText.trim().length < 20}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    创建作品
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
