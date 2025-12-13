"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrialInput } from "./TrialInput";
import { TrialProgress } from "./TrialProgress";
import { TrialResult } from "./TrialResult";
import { useTrialGenerate } from "./hooks/useTrialGenerate";

interface TrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrialDialog({ open, onOpenChange }: TrialDialogProps) {
  const {
    state,
    setPrompt,
    setSelectedStyle,
    generate,
    reset,
    retry,
  } = useTrialGenerate();

  const handleClose = () => {
    onOpenChange(false);
    // 延迟重置状态，让对话框先关闭
    setTimeout(() => reset(), 300);
  };

  const getTitle = () => {
    switch (state.step) {
      case "input":
        return "试一试";
      case "generating":
        return "正在创作中...";
      case "result":
        return "预览完成";
      default:
        return "试一试";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle className="font-comic text-xl">
            {getTitle()}
          </DialogTitle>
          {state.step !== "generating" && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>

        {state.step === "input" && (
          <TrialInput
            state={state}
            onPromptChange={setPrompt}
            onStyleChange={setSelectedStyle}
            onGenerate={generate}
          />
        )}

        {state.step === "generating" && (
          <TrialProgress state={state} />
        )}

        {state.step === "result" && (
          <TrialResult
            state={state}
            onRetry={retry}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { useTrialGenerate } from "./hooks/useTrialGenerate";
export type { TrialState, TrialGenerateResponse } from "./types";
