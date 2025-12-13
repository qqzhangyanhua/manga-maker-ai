"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  LayoutGrid,
  Download,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  OnboardingChoice,
  ONBOARDING_STEPS,
  ONBOARDING_CHOICES,
  STORAGE_KEY,
} from "./types";

interface OnboardingDialogProps {
  onOpenTrialDialog?: () => void;
}

const STEP_ICONS = {
  story: BookOpen,
  character: Users,
  panel: LayoutGrid,
  export: Download,
};

export function OnboardingDialog({ onOpenTrialDialog }: OnboardingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<OnboardingChoice>("trial");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // 检查是否应该显示引导
  useEffect(() => {
    const checkShouldShow = () => {
      // 检查 localStorage
      const completed = localStorage.getItem(STORAGE_KEY);
      if (completed === "true") {
        return false;
      }

      // 检查是否已登录（如果已登录可能是老用户）
      // 这里简单通过 cookie 检查，实际可以调用 /api/auth/me
      return true;
    };

    // 延迟显示，让页面先加载
    const timer = setTimeout(() => {
      if (checkShouldShow()) {
        setOpen(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = useCallback(() => {
    // 保存选择
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }

    setOpen(false);

    // 根据选择跳转
    switch (selectedChoice) {
      case "trial":
        // 打开试一试对话框
        onOpenTrialDialog?.();
        break;
      case "full":
        // 跳转到故事创作页面
        router.push("/story");
        break;
      case "explore":
        // 跳转到示例项目页面
        router.push("/samples");
        break;
    }
  }, [selectedChoice, dontShowAgain, router, onOpenTrialDialog]);

  const handleSkip = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setOpen(false);
  }, [dontShowAgain]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="font-comic text-2xl">
            欢迎使用 ComicAI
          </DialogTitle>
          <DialogDescription className="text-base">
            用 AI 创造你的专属漫画，只需 4 步
          </DialogDescription>
        </DialogHeader>

        {/* 4 步流程 */}
        <div className="grid grid-cols-4 gap-2 py-4 border-y border-border my-4">
          {ONBOARDING_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[step.icon];
            return (
              <div key={step.step} className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <ArrowRight className="absolute -right-3 top-3 w-4 h-4 text-muted-foreground hidden sm:block" />
                  )}
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">
                  {step.title}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {step.description}
                </span>
              </div>
            );
          })}
        </div>

        {/* 选择体验方式 */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            选择你的体验方式
          </p>
          <div className="space-y-2">
            {ONBOARDING_CHOICES.map((choice) => (
              <button
                key={choice.id}
                onClick={() => setSelectedChoice(choice.id)}
                className={cn(
                  "w-full p-3 rounded-lg border-2 text-left transition-all",
                  "flex items-start gap-3",
                  selectedChoice === choice.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                    selectedChoice === choice.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}
                >
                  {selectedChoice === choice.id && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {choice.title}
                    </span>
                    {choice.recommended && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/20 text-secondary">
                        推荐
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {choice.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3 pt-4">
          <Button variant="comic" onClick={handleConfirm} className="w-full">
            开始体验
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="dont-show"
                checked={dontShowAgain}
                onCheckedChange={(checked) =>
                  setDontShowAgain(checked === true)
                }
              />
              <label
                htmlFor="dont-show"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                不再显示此引导
              </label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              跳过
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
