/**
 * 灵感模式对话框 - AI 对话式故事构建
 */
"use client";

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
import { Sparkles, Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import type { InspirationFlowState, StoryDraft } from "./types";
import {
  WelcomeView,
  QuestionView,
  GeneratingView,
  ResultView,
} from "./inspiration";

interface InspirationModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

export function InspirationModeDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: InspirationModeDialogProps) {
  const [state, setState] = useState<InspirationFlowState>({ stage: "welcome" });
  const [isLoading, setIsLoading] = useState(false);

  // 开始灵感模式
  async function handleStart() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/novel/inspiration/start", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          stage: "questioning",
          sessionId: data.session_id,
          question: data,
          currentAnswer: "",
          answers: {},
        });
      } else {
        toast.error("启动失败");
      }
    } catch (error) {
      console.error("启动灵感模式失败:", error);
      toast.error("启动失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }

  // 提交答案并获取下一个问题
  async function handleNext() {
    if (state.stage !== "questioning") return;

    if (!state.currentAnswer.trim()) {
      toast.error("请先回答当前问题");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/novel/inspiration/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: state.sessionId,
          answer: state.currentAnswer,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[灵感模式] 收到下一个问题:", data);

        // 保存答案
        const updatedAnswers = {
          ...state.answers,
          [state.question.step]: state.currentAnswer,
        };

        if (data.is_last) {
          // 所有问题已完成，开始生成
          setState({ stage: "generating", sessionId: state.sessionId });
          setIsLoading(false);
          await handleGenerate(state.sessionId, updatedAnswers);
        } else {
          setState({
            stage: "questioning",
            sessionId: state.sessionId,
            question: data,
            currentAnswer: "",
            answers: updatedAnswers,
          });
        }
      } else {
        const error = await response.json();
        // 处理 FastAPI 验证错误（detail 是数组）或普通错误（detail 是字符串）
        const errorMessage = Array.isArray(error.detail)
          ? error.detail.map((e: { msg: string }) => e.msg).join(", ")
          : error.detail || "提交失败";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("提交答案失败:", error);
      toast.error("提交失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }

  // 更新当前答案
  function updateAnswer(answer: string) {
    if (state.stage === "questioning") {
      setState({ ...state, currentAnswer: answer });
    }
  }

  // 生成故事雏形
  async function handleGenerate(sessionId: string, answers: Record<number, string>) {
    try {
      const response = await fetch("/api/novel/inspiration/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (response.ok) {
        const data: StoryDraft = await response.json();
        setState({
          stage: "result",
          sessionId: sessionId,
          draft: data,
          selectedTitle: data.title_suggestions[0],
          answers: answers,
        });
        toast.success("故事雏形生成成功");
      } else {
        const error = await response.json();
        const errorMessage = Array.isArray(error.detail)
          ? error.detail.map((e: { msg: string }) => e.msg).join(", ")
          : error.detail || "生成失败";
        toast.error(errorMessage);
        setState({ stage: "welcome" });
      }
    } catch (error) {
      console.error("生成故事雏形失败:", error);
      toast.error("生成失败，请重试");
      setState({ stage: "welcome" });
    }
  }

  // 选择标题
  function selectTitle(title: string) {
    if (state.stage === "result") {
      setState({ ...state, selectedTitle: title });
    }
  }

  // 创建项目
  async function handleCreateProject() {
    if (state.stage !== "result") return;

    if (!state.selectedTitle) {
      toast.error("请选择一个标题");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/novel/inspiration/create-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_title: state.selectedTitle,
          draft: state.draft,
          genre: state.answers[1] || "",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("项目创建成功");
        onProjectCreated(data.project_id);
        handleClose();
      } else {
        const error = await response.json();
        const errorMessage = Array.isArray(error.detail)
          ? error.detail.map((e: { msg: string }) => e.msg).join(", ")
          : error.detail || "创建失败";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("创建项目失败:", error);
      toast.error("创建失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }

  // 重新开始
  function handleRestart() {
    setState({ stage: "welcome" });
  }

  // 关闭对话框
  function handleClose() {
    setState({ stage: "welcome" });
    onClose();
  }

  // 渲染内容
  function renderContent() {
    switch (state.stage) {
      case "welcome":
        return <WelcomeView onStart={handleStart} isLoading={isLoading} />;
      case "questioning":
        return (
          <QuestionView
            question={state.question}
            currentAnswer={state.currentAnswer}
            answers={state.answers}
            onAnswerChange={updateAnswer}
          />
        );
      case "generating":
        return <GeneratingView />;
      case "result":
        return (
          <ResultView
            draft={state.draft}
            selectedTitle={state.selectedTitle}
            onSelectTitle={selectTitle}
          />
        );
    }
  }

  // 渲染页脚
  function renderFooter() {
    switch (state.stage) {
      case "questioning":
        return (
          <>
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button onClick={handleNext} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  下一步
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        );
      case "result":
        return (
          <>
            <Button variant="outline" onClick={handleRestart}>
              重新开始
            </Button>
            <Button onClick={handleCreateProject} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  创建项目
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        );
      default:
        return null;
    }
  }

  // 获取描述文本
  function getDescription() {
    switch (state.stage) {
      case "welcome":
        return "AI 对话式引导，帮你构建故事雏形";
      case "questioning":
        return "回答几个简单问题";
      case "generating":
        return "AI 正在生成故事框架";
      case "result":
        return "查看生成的故事框架";
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            灵感模式
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {renderContent()}

        <DialogFooter>{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
