/**
 * 专业创作模式对话框
 * 向导式工作流：创意 → 设定 → 框架 → 创作
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  BookOpen,
  Users,
  FileText,
  PenTool,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { novelTheme } from "../theme";
import { TemplateSelector } from "./TemplateSelector";
import { WorkflowStep } from "./WorkflowStep";

// 工作流阶段配置
const WORKFLOW_PHASES = [
  {
    phase: "creative",
    displayName: "创意阶段",
    description: "确定创意方向和市场定位",
    icon: Sparkles,
  },
  {
    phase: "setting",
    displayName: "设定阶段",
    description: "构建世界观和角色设定",
    icon: Users,
  },
  {
    phase: "framework",
    displayName: "框架阶段",
    description: "制作故事大纲和章节规划",
    icon: FileText,
  },
  {
    phase: "writing",
    displayName: "创作阶段",
    description: "生成章节内容",
    icon: PenTool,
  },
];

interface Template {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase: string;
  phase_display: string;
  category: string;
  genre: string | null;
  usage_count: number;
}

interface Genre {
  genre: string;
  display_name: string;
  count: number;
}

interface WorkflowSession {
  session_id: string;
  current_phase: string;
  completed_phases: string[];
  phase_data: Record<string, unknown>;
  available_templates: Template[];
  project_id: string | null;
  expires_at: string;
}

interface ProfessionalModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

type DialogStage =
  | "genre_select"
  | "workflow"
  | "generating"
  | "result"
  | "completing";

export function ProfessionalModeDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: ProfessionalModeDialogProps) {
  // 状态管理
  const [stage, setStage] = useState<DialogStage>("genre_select");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [session, setSession] = useState<WorkflowSession | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [inputData, setInputData] = useState<Record<string, string>>({});
  const [generatedResult, setGeneratedResult] = useState<string>("");
  const [parsedResult, setParsedResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationInput, setOptimizationInput] = useState("");
  const [projectTitle, setProjectTitle] = useState("");

  // 获取专题列表
  const fetchGenres = useCallback(async () => {
    try {
      const response = await fetch("/api/novel/templates/genres");
      if (response.ok) {
        const data = await response.json();
        setGenres(data.genres || []);
      }
    } catch (error) {
      console.error("获取专题列表失败:", error);
    }
  }, []);

  // 开始工作流
  const startWorkflow = async (genre: string | null) => {
    setLoading(true);
    try {
      const response = await fetch("/api/novel/workflow/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: genre === "general" ? null : genre }),
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data);
        setStage("workflow");
      } else {
        const error = await response.json();
        toast.error(error.detail || "启动工作流失败");
      }
    } catch (error) {
      console.error("启动工作流失败:", error);
      toast.error("启动工作流失败");
    } finally {
      setLoading(false);
    }
  };

  // 执行当前阶段
  const executePhase = async () => {
    if (!session || !selectedTemplate) return;

    setLoading(true);
    setStage("generating");
    try {
      const response = await fetch(`/api/novel/workflow/${session.session_id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          input_data: inputData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedResult(data.result || "");
        setParsedResult(data.parsed_result || null);
        setStage("result");
      } else {
        const error = await response.json();
        toast.error(error.detail || "生成失败");
        setStage("workflow");
      }
    } catch (error) {
      console.error("执行阶段失败:", error);
      toast.error("生成失败");
      setStage("workflow");
    } finally {
      setLoading(false);
    }
  };

  // AI 优化结果
  const optimizeResult = async () => {
    if (!session || !generatedResult) return;

    setOptimizing(true);
    try {
      const response = await fetch(`/api/novel/workflow/${session.session_id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_result: generatedResult,
          optimization_instruction: optimizationInput || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedResult(data.optimized_result || "");
        setParsedResult(data.parsed_result || null);
        setOptimizationInput("");
        toast.success("优化完成");
      } else {
        const error = await response.json();
        toast.error(error.detail || "优化失败");
      }
    } catch (error) {
      console.error("优化结果失败:", error);
      toast.error("优化失败");
    } finally {
      setOptimizing(false);
    }
  };

  // 进入下一阶段
  const nextPhase = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/novel/workflow/${session.session_id}/next`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.is_final) {
          // 所有阶段完成
          setStage("completing");
        } else {
          // 更新会话状态
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  current_phase: data.current_phase,
                  completed_phases: data.completed_phases,
                  available_templates: data.available_templates,
                }
              : null
          );
          setSelectedTemplate(null);
          setInputData({});
          setGeneratedResult("");
          setParsedResult(null);
          setStage("workflow");
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || "进入下一阶段失败");
      }
    } catch (error) {
      console.error("进入下一阶段失败:", error);
      toast.error("进入下一阶段失败");
    } finally {
      setLoading(false);
    }
  };

  // 返回上一阶段
  const previousPhase = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/novel/workflow/${session.session_id}/previous`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setSession((prev) =>
          prev
            ? {
                ...prev,
                current_phase: data.current_phase,
                completed_phases: data.completed_phases,
                available_templates: data.available_templates,
              }
            : null
        );
        setSelectedTemplate(null);
        setInputData(data.previous_input || {});
        setGeneratedResult(data.previous_output || "");
        setParsedResult(null);
        setStage("workflow");
      } else {
        const error = await response.json();
        toast.error(error.detail || "返回上一阶段失败");
      }
    } catch (error) {
      console.error("返回上一阶段失败:", error);
      toast.error("返回上一阶段失败");
    } finally {
      setLoading(false);
    }
  };

  // 完成工作流，创建项目
  const completeWorkflow = async () => {
    if (!session || !projectTitle.trim()) {
      toast.error("请输入项目标题");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/novel/workflow/${session.session_id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_title: projectTitle,
          project_description: null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("项目创建成功");
        onProjectCreated(data.project_id);
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.detail || "创建项目失败");
      }
    } catch (error) {
      console.error("完成工作流失败:", error);
      toast.error("创建项目失败");
    } finally {
      setLoading(false);
    }
  };

  // 关闭对话框
  const handleClose = () => {
    setStage("genre_select");
    setSelectedGenre(null);
    setSession(null);
    setSelectedTemplate(null);
    setInputData({});
    setGeneratedResult("");
    setParsedResult(null);
    setProjectTitle("");
    onClose();
  };

  // 初始化
  useEffect(() => {
    if (isOpen) {
      fetchGenres();
    }
  }, [isOpen, fetchGenres]);

  // 获取当前阶段信息
  const currentPhaseInfo = session
    ? WORKFLOW_PHASES.find((p) => p.phase === session.current_phase)
    : null;

  // 获取当前阶段索引
  const currentPhaseIndex = session
    ? WORKFLOW_PHASES.findIndex((p) => p.phase === session.current_phase)
    : -1;

  // 渲染专题选择界面
  const renderGenreSelect = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">选择创作类型</h3>
        <p className="text-sm text-zinc-400">
          选择一个专题类型以获取针对性的创作模板，或选择通用模板
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {genres.map((genre) => (
          <button
            key={genre.genre}
            onClick={() => setSelectedGenre(genre.genre)}
            className={cn(
              "p-4 rounded-lg border-2 transition-all text-left",
              selectedGenre === genre.genre
                ? "border-purple-500 bg-purple-500/10"
                : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
            )}
          >
            <div className="font-medium text-white">{genre.display_name}</div>
            <div className="text-xs text-zinc-500 mt-1">{genre.count} 个模板</div>
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button variant="outline" onClick={handleClose} className={novelTheme.button.outline}>
          取消
        </Button>
        <Button
          onClick={() => startWorkflow(selectedGenre)}
          disabled={loading}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              启动中...
            </>
          ) : (
            <>
              开始创作
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // 渲染进度指示器
  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {WORKFLOW_PHASES.map((phase, index) => {
        const isCompleted = session?.completed_phases.includes(phase.phase);
        const isCurrent = session?.current_phase === phase.phase;
        const Icon = phase.icon;

        return (
          <div key={phase.phase} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                isCompleted
                  ? "bg-green-500/20 text-green-500"
                  : isCurrent
                  ? "bg-purple-500/20 text-purple-500 ring-2 ring-purple-500"
                  : "bg-zinc-800 text-zinc-500"
              )}
            >
              {isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            {index < WORKFLOW_PHASES.length - 1 && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 mx-1",
                  isCompleted ? "text-green-500" : "text-zinc-600"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // 渲染工作流界面
  const renderWorkflow = () => (
    <div className="space-y-4">
      {renderProgressIndicator()}

      {currentPhaseInfo && (
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            {currentPhaseInfo.displayName}
          </h3>
          <p className="text-sm text-zinc-400">{currentPhaseInfo.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 模板选择 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">选择模板</h4>
          <TemplateSelector
            templates={session?.available_templates || []}
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
          />
        </div>

        {/* 输入表单 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-300">输入参数</h4>
          <WorkflowStep
            template={selectedTemplate}
            inputData={inputData}
            onInputChange={setInputData}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className={novelTheme.button.outline}
          >
            取消
          </Button>
          {currentPhaseIndex > 0 && (
            <Button
              variant="outline"
              onClick={previousPhase}
              disabled={loading}
              className={novelTheme.button.outline}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              上一步
            </Button>
          )}
        </div>
        <Button
          onClick={executePhase}
          disabled={loading || !selectedTemplate}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              开始生成
              <Sparkles className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // 渲染生成中界面
  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-pulse" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">AI 正在创作中...</h3>
        <p className="text-sm text-zinc-400 mt-1">
          {currentPhaseInfo?.displayName}: {selectedTemplate?.name}
        </p>
      </div>
    </div>
  );

  // 渲染结果界面
  const renderResult = () => (
    <div className="space-y-4">
      {renderProgressIndicator()}

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {currentPhaseInfo?.displayName} - 生成结果
        </h3>
      </div>

      <ScrollArea className="h-[250px] rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
        <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
          {generatedResult}
        </pre>
      </ScrollArea>

      {/* AI 优化区域 */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-zinc-300">AI 智能优化</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={optimizationInput}
            onChange={(e) => setOptimizationInput(e.target.value)}
            placeholder="输入优化指令（可选），如：增加更多细节、调整风格..."
            className="flex-1 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <Button
            onClick={optimizeResult}
            disabled={optimizing || !generatedResult}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {optimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                优化中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                优化
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          可以多次优化直到满意，优化后的结果会自动保存
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => setStage("workflow")}
          className={novelTheme.button.outline}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          重新生成
        </Button>
        <Button
          onClick={nextPhase}
          disabled={loading || optimizing}
          className={novelTheme.button.primary}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : currentPhaseIndex >= WORKFLOW_PHASES.length - 1 ? (
            <>
              完成创作
              <Check className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              下一阶段
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // 渲染完成界面
  const renderCompleting = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-white">创作流程完成</h3>
        <p className="text-sm text-zinc-400 mt-1">
          请为您的小说项目命名
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">项目标题</label>
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="输入小说标题..."
          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={() => setStage("result")}
          className={novelTheme.button.outline}
        >
          返回
        </Button>
        <Button
          onClick={completeWorkflow}
          disabled={loading || !projectTitle.trim()}
          className={novelTheme.button.primary}
        >
          {loading ? (
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
      </div>
    </div>
  );

  // 根据阶段渲染内容
  const renderContent = () => {
    switch (stage) {
      case "genre_select":
        return renderGenreSelect();
      case "workflow":
        return renderWorkflow();
      case "generating":
        return renderGenerating();
      case "result":
        return renderResult();
      case "completing":
        return renderCompleting();
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <PenTool className="h-5 w-5 text-purple-500" />
            专业创作模式
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {stage === "genre_select"
              ? "选择创作类型开始专业的小说创作流程"
              : stage === "completing"
              ? "为您的作品命名并创建项目"
              : `${currentPhaseInfo?.displayName || ""} - ${currentPhaseInfo?.description || ""}`}
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
