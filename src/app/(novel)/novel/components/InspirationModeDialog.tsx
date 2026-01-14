/**
 * 灵感模式对话框 - AI 对话式故事构建
 * 优化版本：生成失败可重试、算力消耗提示
 */
"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Check,
  ArrowLeft,
  X,
  RefreshCw,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { parseErrorFromResponse, fetchWithTimeout } from "@/lib/error-utils";
import type { InspirationFlowState, StoryDraft } from "./types";
import {
  WelcomeView,
  QuestionView,
  GeneratingView,
  ResultView,
} from "./inspiration";
import { novelTheme } from "../theme";

// 算力消耗估算（可从后端配置获取）
const ESTIMATED_CREDITS = 50;

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
  const abortControllerRef = useRef<AbortController | null>(null);

  // 开始灵感模式
  async function handleStart() {
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetchWithTimeout(
        "/api/novel/inspiration/start",
        {
          method: "POST",
          signal: abortControllerRef.current.signal,
        },
        10000
      );

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
        const errorMessage = await parseErrorFromResponse(response, "启动失败");
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("启动灵感模式失败:", error);
        toast.error(error.message || "启动失败，请重试");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetchWithTimeout(
        "/api/novel/inspiration/next",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: state.sessionId,
            answer: state.currentAnswer,
          }),
          signal: abortControllerRef.current.signal,
        },
        15000
      );

      if (response.ok) {
        const data = await response.json();

        // 保存答案
        const updatedAnswers = {
          ...state.answers,
          [state.question.step]: state.currentAnswer,
        };

        if (data.is_last) {
          // 所有问题已完成，开始生成
          setState({
            stage: "generating",
            sessionId: state.sessionId,
            answers: updatedAnswers,
          });
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
        const errorMessage = await parseErrorFromResponse(response, "提交失败");
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("提交答案失败:", error);
        toast.error(error.message || "提交失败，请重试");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  // 返回上一步
  function handlePrevious() {
    if (state.stage !== "questioning") return;

    if (state.question.step <= 1) {
      toast.info("已经是第一个问题了");
      return;
    }

    // 注意：这里需要后端支持获取上一个问题，或者前端缓存所有问题
    toast.info("返回上一步功能需要后端支持，暂未实现");
  }

  // 更新当前答案
  function updateAnswer(answer: string) {
    if (state.stage === "questioning") {
      setState({ ...state, currentAnswer: answer });
    }
  }

  // 生成故事雏形
  async function handleGenerate(sessionId: string, answers: Record<number, string>) {
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetchWithTimeout(
        "/api/novel/inspiration/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
          signal: abortControllerRef.current.signal,
        },
        90000 // 90秒超时，给 AI 足够时间
      );

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
        const errorMessage = await parseErrorFromResponse(response, "生成失败");
        // 生成失败，保留答案，进入失败状态
        setState({
          stage: "generate_failed",
          sessionId: sessionId,
          answers: answers,
          errorMessage: errorMessage,
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("生成故事雏形失败:", error);
        const errorMsg = error.message || "生成失败，请重试";
        // 生成失败，保留答案，进入失败状态
        setState({
          stage: "generate_failed",
          sessionId: sessionId,
          answers: answers,
          errorMessage: errorMsg,
        });
        toast.error(errorMsg);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }

  // 重试生成
  async function handleRetryGenerate() {
    if (state.stage !== "generate_failed") return;

    setState({
      stage: "generating",
      sessionId: state.sessionId,
      answers: state.answers,
    });

    await handleGenerate(state.sessionId, state.answers);
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
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetchWithTimeout(
        "/api/novel/inspiration/create-project",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_title: state.selectedTitle,
            draft: state.draft,
            genre: state.answers[1] || "",
          }),
          signal: abortControllerRef.current.signal,
        },
        15000
      );

      if (response.ok) {
        const data = await response.json();
        toast.success("项目创建成功");
        onProjectCreated(data.project_id);
        handleClose();
      } else {
        const errorMessage = await parseErrorFromResponse(response, "创建失败");
        toast.error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("创建项目失败:", error);
        toast.error(error.message || "创建失败，请重试");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  // 取消当前操作
  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      toast.info("已取消操作");
    }
  }

  // 重新开始
  function handleRestart() {
    setState({ stage: "welcome" });
  }

  // 关闭对话框
  function handleClose() {
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ stage: "welcome" });
    onClose();
  }

  // 渲染生成失败界面
  function renderFailedView() {
    if (state.stage !== "generate_failed") return null;

    return (
      <div className="py-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">生成失败</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {state.errorMessage}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          你的回答已保存，可以直接重试
        </p>
      </div>
    );
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
      case "generate_failed":
        return renderFailedView();
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
      case "welcome":
        return (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span>预计消耗 {ESTIMATED_CREDITS} 算力</span>
            </div>
            <div />
          </div>
        );
      case "questioning":
        return (
          <>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                取消
              </Button>
              {state.question.step > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  上一步
                </Button>
              )}
            </div>
            <Button onClick={handleNext} disabled={isLoading} className={novelTheme.button.primary}>
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
      case "generating":
        return (
          <Button variant="outline" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            取消生成
          </Button>
        );
      case "generate_failed":
        return (
          <>
            <Button variant="outline" onClick={handleRestart}>
              重新开始
            </Button>
            <Button onClick={handleRetryGenerate} className={novelTheme.button.primary}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重试生成
            </Button>
          </>
        );
      case "result":
        return (
          <>
            <Button variant="outline" onClick={handleRestart}>
              重新开始
            </Button>
            <Button onClick={handleCreateProject} disabled={isLoading} className={novelTheme.button.primary}>
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
      case "generate_failed":
        return "生成遇到问题";
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
