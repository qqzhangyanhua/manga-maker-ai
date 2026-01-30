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
import { OptionsGenerating } from "./stages/OptionsGenerating";
import { OptionsSelect } from "./stages/OptionsSelect";
import { Editing } from "./stages/Editing";
import { Preview } from "./stages/Preview";
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
    setStage,
    reset,
  } = useWorkflowMachine();

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
        // 立即触发第一阶段的方案生成
        const data = await api.generateOptions(session.session_id);
        dispatch({ type: "GENERATE_OPTIONS_SUCCESS", payload: data.options });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "启动工作流失败");
        setLoading(false);
      }
    },
    [dispatch, setLoading]
  );


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

  // 生成方案选项
  const generateOptions = useCallback(async () => {
    if (!state.session) return;

    setLoading(true);
    try {
      const data = await api.generateOptions(state.session.session_id);
      dispatch({ type: "GENERATE_OPTIONS_SUCCESS", payload: data.options });
    } catch (error) {
      if (error instanceof api.SessionExpiredError) {
        dispatch({ type: "SESSION_EXPIRED" });
      } else {
        toast.error(error instanceof Error ? error.message : "生成方案失败");
        // 回退到选择类型
        setStage("genre_select");
      }
      setLoading(false);
    }
  }, [state.session, dispatch, setLoading, setStage]);

  // 选择方案
  const handleSelectOption = useCallback((optionId: string, content: string) => {
    dispatch({ type: "SELECT_OPTION", payload: { id: optionId, content } });
  }, [dispatch]);

  // 重新生成方案
  const handleRegenerateOptions = useCallback(async () => {
    dispatch({ type: "REGENERATE_OPTIONS" });
    await generateOptions();
  }, [dispatch, generateOptions]);

  // 确认当前阶段
  const handleConfirmPhase = useCallback(async () => {
    if (!state.session || !state.editingContent) return;

    setLoading(true);
    try {
      const currentPhaseIndex = state.phaseResults.length;
      const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex];
      
      if (!currentPhaseInfo) {
        toast.error("无效的阶段信息");
        setLoading(false);
        return;
      }
      
      // 调用后端保存
      const result = await api.selectOption(
        state.session.session_id,
        state.selectedOptionId || "opt_1",
        state.editingContent
      );

      // 找到选中的方案摘要
      const selectedOption = state.generatedOptions.find(
        (o) => o.id === state.selectedOptionId
      );

      dispatch({
        type: "CONFIRM_PHASE",
        payload: {
          phase: currentPhaseInfo.phase,
          phaseName: currentPhaseInfo.displayName,
          content: state.editingContent,
          summary: selectedOption?.summary || currentPhaseInfo.displayName,
        },
      });

      // 如果不是最后阶段，自动触发下一阶段的方案生成
      if (!result.is_final) {
        await generateOptions();
      }
    } catch (error) {
      if (error instanceof api.SessionExpiredError) {
        dispatch({ type: "SESSION_EXPIRED" });
      } else {
        toast.error(error instanceof Error ? error.message : "保存失败");
      }
      setLoading(false);
    }
  }, [
    state.session,
    state.editingContent,
    state.selectedOptionId,
    state.generatedOptions,
    state.phaseResults,
    dispatch,
    setLoading,
    generateOptions,
  ]);

  // 返回方案选择
  const handleBackToSelect = useCallback(() => {
    setStage("options_select");
  }, [setStage]);

  // 重做某个阶段
  const handleRedoPhase = useCallback(async (phase: string) => {
    if (!state.session) return;

    setLoading(true);
    try {
      await api.redoPhase(state.session.session_id, phase);
      dispatch({ type: "REDO_PHASE", payload: phase });
      // 自动触发方案生成
      await generateOptions();
    } catch (error) {
      if (error instanceof api.SessionExpiredError) {
        dispatch({ type: "SESSION_EXPIRED" });
      } else {
        toast.error(error instanceof Error ? error.message : "重做失败");
      }
      setLoading(false);
    }
  }, [state.session, dispatch, setLoading, generateOptions]);

  // 从预览进入完成
  const handleGoToComplete = useCallback(() => {
    setStage("completing");
  }, [setStage]);

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
      case "options_generating":
        return <OptionsGenerating state={state} dispatch={dispatch} />;
      case "options_select":
        return (
          <OptionsSelect
            state={state}
            dispatch={dispatch}
            onSelectOption={handleSelectOption}
            onRegenerateOptions={handleRegenerateOptions}
          />
        );
      case "editing":
        return (
          <Editing
            state={state}
            dispatch={dispatch}
            onConfirm={handleConfirmPhase}
            onBackToSelect={handleBackToSelect}
          />
        );
      case "preview":
        return (
          <Preview
            state={state}
            dispatch={dispatch}
            onRedoPhase={handleRedoPhase}
            onComplete={handleGoToComplete}
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
    if (state.stage === "options_generating" || state.stage === "options_select" || state.stage === "editing") {
      const currentPhaseIndex = state.phaseResults.length;
      const phaseInfo = WORKFLOW_PHASES[currentPhaseIndex];
      return `${phaseInfo?.displayName || ""} - ${phaseInfo?.description || ""}`;
    }
    if (state.stage === "preview") {
      return "预览并确认您的创作内容";
    }
    if (state.stage === "completing") {
      return "为您的作品命名并创建项目";
    }
    if (state.stage === "session_expired") {
      return "会话已过期，请重新开始";
    }
    return "";
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
