/**
 * 专业创作模式对话框
 * 向导式工作流：创意 → 设定 → 框架 → 创作
 */
"use client";

import { useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PenTool } from "lucide-react";
import { toast } from "sonner";

import { ProfessionalModeDialogProps, WORKFLOW_PHASES } from "./types";
import { useWorkflowMachine } from "./useWorkflowMachine";
import * as api from "./api";

import { GenreSelect } from "./stages/GenreSelect";
import { Workflow } from "./stages/Workflow";
import { Generating } from "./stages/Generating";
import { Result } from "./stages/Result";
import { Completing } from "./stages/Completing";
import { SessionExpired } from "./stages/SessionExpired";

export function ProfessionalModeDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: ProfessionalModeDialogProps) {
  const {
    state,
    dispatch,
    setLoading,
    setOptimizing,
    setStage,
    createAbortController,
    cancelGeneration,
    clearAbortController,
    reset,
  } = useWorkflowMachine();

  const currentPhaseInfo = state.session
    ? WORKFLOW_PHASES.find((p) => p.phase === state.session?.current_phase)
    : null;

  // 获取专题列表
  const fetchGenres = useCallback(async () => {
    try {
      const genres = await api.fetchGenres();
      dispatch({ type: "SET_GENRES", payload: genres });
    } catch (error) {
      console.error("获取专题列表失败:", error);
    }
  }, [dispatch]);

  // 检查未完成的会话
  const checkPendingSession = useCallback(async () => {
    const session = await api.checkPendingSession();
    if (session) {
      dispatch({ type: "SET_PENDING_SESSION", payload: session });
      dispatch({ type: "SET_SHOW_RESUME_PROMPT", payload: true });
    }
  }, [dispatch]);

  // 恢复会话
  const resumeSession = useCallback(() => {
    dispatch({ type: "RESUME_SESSION" });
    toast.success("已恢复上次的创作进度");
  }, [dispatch]);

  // 开始工作流
  const startWorkflow = useCallback(
    async (genre: string | null) => {
      setLoading(true);
      try {
        const session = await api.startWorkflow(genre);
        dispatch({ type: "START_WORKFLOW_SUCCESS", payload: session });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "启动工作流失败");
        setLoading(false);
      }
    },
    [dispatch, setLoading]
  );

  // 执行当前阶段
  const executePhase = useCallback(async () => {
    if (!state.session || !state.selectedTemplate) return;

    const controller = createAbortController();
    setLoading(true);
    setStage("generating");

    try {
      const data = await api.executePhase(
        state.session.session_id,
        state.selectedTemplate.id,
        state.inputData,
        controller.signal
      );
      dispatch({
        type: "EXECUTE_PHASE_SUCCESS",
        payload: {
          result: data.result || "",
          parsedResult: data.parsed_result || null,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.info("已取消生成");
        setStage("workflow");
      } else if (error instanceof api.SessionExpiredError) {
        dispatch({ type: "SESSION_EXPIRED" });
      } else {
        toast.error(error instanceof Error ? error.message : "生成失败");
        setStage("workflow");
      }
      setLoading(false);
    } finally {
      clearAbortController();
    }
  }, [
    state.session,
    state.selectedTemplate,
    state.inputData,
    dispatch,
    setLoading,
    setStage,
    createAbortController,
    clearAbortController,
  ]);

  // AI 优化结果
  const optimizeResult = useCallback(
    async (instruction?: string) => {
      if (!state.session || !state.generatedResult) return;

      const optimizationInstruction =
        instruction || state.optimizationInput || null;
      setOptimizing(true);

      try {
        const data = await api.optimizeResult(
          state.session.session_id,
          state.generatedResult,
          optimizationInstruction
        );
        dispatch({
          type: "OPTIMIZE_SUCCESS",
          payload: {
            result: data.optimized_result || "",
            parsedResult: data.parsed_result || null,
            instruction: optimizationInstruction || undefined,
          },
        });
        toast.success("优化完成");
      } catch (error) {
        if (error instanceof api.SessionExpiredError) {
          dispatch({ type: "SESSION_EXPIRED" });
        } else {
          toast.error(error instanceof Error ? error.message : "优化失败");
        }
        setOptimizing(false);
      }
    },
    [state.session, state.generatedResult, state.optimizationInput, dispatch, setOptimizing]
  );

  // 进入下一阶段
  const nextPhase = useCallback(async () => {
    if (!state.session) return;

    setLoading(true);
    try {
      const data = await api.nextPhase(state.session.session_id);
      dispatch({
        type: "NEXT_PHASE_SUCCESS",
        payload: {
          isFinal: data.is_final,
          currentPhase: data.current_phase,
          completedPhases: data.completed_phases,
          availableTemplates: data.available_templates,
        },
      });
    } catch (error) {
      if (error instanceof api.SessionExpiredError) {
        dispatch({ type: "SESSION_EXPIRED" });
      } else {
        toast.error(error instanceof Error ? error.message : "进入下一阶段失败");
      }
      setLoading(false);
    }
  }, [state.session, dispatch, setLoading]);

  // 返回上一阶段
  const previousPhase = useCallback(async () => {
    if (!state.session) return;

    setLoading(true);
    try {
      const data = await api.previousPhase(state.session.session_id);
      dispatch({
        type: "PREVIOUS_PHASE_SUCCESS",
        payload: {
          currentPhase: data.current_phase,
          completedPhases: data.completed_phases,
          availableTemplates: data.available_templates,
          previousInput: data.previous_input,
          previousOutput: data.previous_output,
        },
      });
    } catch (error) {
      if (error instanceof api.SessionExpiredError) {
        dispatch({ type: "SESSION_EXPIRED" });
      } else {
        toast.error(error instanceof Error ? error.message : "返回上一阶段失败");
      }
      setLoading(false);
    }
  }, [state.session, dispatch, setLoading]);

  // 完成工作流
  const completeWorkflow = useCallback(async () => {
    if (!state.session || !state.projectTitle.trim()) {
      toast.error("请输入项目标题");
      return;
    }

    setLoading(true);
    try {
      const data = await api.completeWorkflow(
        state.session.session_id,
        state.projectTitle,
        state.projectDescription || null
      );
      toast.success("项目创建成功");
      onProjectCreated(data.project_id);
      reset();
      onClose();
    } catch (error) {
      if (error instanceof api.SessionExpiredError) {
        dispatch({ type: "SESSION_EXPIRED" });
      } else {
        toast.error(error instanceof Error ? error.message : "创建项目失败");
      }
      setLoading(false);
    }
  }, [
    state.session,
    state.projectTitle,
    state.projectDescription,
    dispatch,
    setLoading,
    onProjectCreated,
    onClose,
    reset,
  ]);

  // 关闭对话框
  const handleClose = useCallback(
    (force = false) => {
      if (!force && state.session && state.stage !== "genre_select") {
        dispatch({ type: "SET_SHOW_CLOSE_CONFIRM", payload: true });
        return;
      }
      reset();
      onClose();
    },
    [state.session, state.stage, dispatch, reset, onClose]
  );

  // 确认关闭
  const confirmClose = useCallback(() => {
    dispatch({ type: "SET_SHOW_CLOSE_CONFIRM", payload: false });
    reset();
    onClose();
  }, [dispatch, reset, onClose]);

  // 初始化
  useEffect(() => {
    if (isOpen) {
      fetchGenres();
      checkPendingSession();
    }
  }, [isOpen, fetchGenres, checkPendingSession]);

  // 根据阶段渲染内容
  const renderContent = () => {
    switch (state.stage) {
      case "genre_select":
        return (
          <GenreSelect
            state={state}
            dispatch={dispatch}
            onStartWorkflow={startWorkflow}
            onResumeSession={resumeSession}
            onClose={handleClose}
          />
        );
      case "workflow":
        return (
          <Workflow
            state={state}
            dispatch={dispatch}
            onExecutePhase={executePhase}
            onPreviousPhase={previousPhase}
            onClose={handleClose}
          />
        );
      case "generating":
        return (
          <Generating
            state={state}
            dispatch={dispatch}
            onCancel={cancelGeneration}
          />
        );
      case "result":
        return (
          <Result
            state={state}
            dispatch={dispatch}
            onOptimize={optimizeResult}
            onNextPhase={nextPhase}
          />
        );
      case "completing":
        return (
          <Completing
            state={state}
            dispatch={dispatch}
            onComplete={completeWorkflow}
          />
        );
      case "session_expired":
        return <SessionExpired state={state} dispatch={dispatch} />;
      default:
        return null;
    }
  };

  const getDescription = () => {
    if (state.stage === "genre_select") {
      return "选择创作类型开始专业的小说创作流程";
    }
    if (state.stage === "completing") {
      return "为您的作品命名并创建项目";
    }
    if (state.stage === "session_expired") {
      return "会话已过期，请重新开始";
    }
    return `${currentPhaseInfo?.displayName || ""} - ${currentPhaseInfo?.description || ""}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => handleClose()}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <PenTool className="h-5 w-5 text-purple-500" />
              专业创作模式
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {getDescription()}
            </DialogDescription>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={state.showCloseConfirm}
        onOpenChange={(open) =>
          dispatch({ type: "SET_SHOW_CLOSE_CONFIRM", payload: open })
        }
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              确认离开？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              您有未完成的创作进度，离开后数据将保留 24 小时。
              <br />
              下次打开时可以选择继续创作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              继续创作
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClose}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              确认离开
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
