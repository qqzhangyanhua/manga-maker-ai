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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Check,
  Bot,
  Lightbulb,
  FileText,
  User as UserIcon,
  Globe,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { InspirationFlowState, Question, StoryDraft } from "./types";

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

        // 保存答案
        const updatedAnswers = {
          ...state.answers,
          [state.question.step]: state.currentAnswer,
        };

        if (data.is_last) {
          // 所有问题已完成，开始生成
          setState({ stage: "generating", sessionId: state.sessionId });
          setIsLoading(false);
          await handleGenerate(state.sessionId);
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
        toast.error("提交失败");
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
  async function handleGenerate(sessionId: string) {
    try {
      const response = await fetch("/api/novel/inspiration/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          stage: "result",
          draft: data,
          selectedTitle: data.title_suggestions[0],
        });
        toast.success("故事雏形生成成功");
      } else {
        const error = await response.json();
        toast.error(error.detail || "生成失败");
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("项目创建成功");
        onProjectCreated(data.project_id);
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.detail || "创建失败");
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

// 欢迎界面
function WelcomeView({
  onStart,
  isLoading,
}: {
  onStart: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">欢迎使用灵感模式</h3>
          <p className="text-muted-foreground">
            通过 AI 对话式引导，帮你构建故事的雏形
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            如何使用
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. 回答 6 个简单问题（类型、主题、主角等）</p>
          <p>2. AI 根据你的回答生成完整的故事框架</p>
          <p>3. 选择喜欢的标题，一键创建项目</p>
          <p>4. 开始你的创作之旅</p>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={onStart} disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              启动中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              开始创作
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// 问题界面
function QuestionView({
  question,
  currentAnswer,
  answers,
  onAnswerChange,
}: {
  question: Question;
  currentAnswer: string;
  answers: Record<number, string>;
  onAnswerChange: (answer: string) => void;
}) {
  const totalSteps = question.total_steps || 6;

  // 解析 hint 中的快捷选项（用顿号、逗号或分号分割）
  const hintSuggestions = question.hint
    ? question.hint
        .replace(/\.\.\./g, "") // 移除省略号
        .replace(/^(比如|例如|如|如:|比如:|例如:)\s*[:：]?\s*/i, "") // 移除引导词
        .split(/[、,;，；]/) // 支持中英文分隔符
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 20) // 过滤空字符串和过长文本
    : [];

  const showHintSuggestions =
    question.type === "text" && hintSuggestions.length > 0;

  return (
    <div className="space-y-6 py-4">
      {/* 进度指示 */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isActive = step <= question.step;
          return (
            <div
              key={step}
              className={`h-2 w-12 rounded-full ${
                isActive ? "bg-purple-500" : "bg-muted"
              }`}
            />
          );
        })}
      </div>

      <div className="text-center">
        <Badge variant="outline" className="mb-2">
          步骤 {question.step}/{totalSteps}
        </Badge>
      </div>

      {/* AI 问题 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-medium">{question.question}</p>
              {question.hint && !showHintSuggestions && (
                <p className="text-sm text-muted-foreground flex items-start gap-1">
                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {question.hint}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户回答 */}
      <div className="space-y-3">
        <Label>你的回答</Label>
        {question.type === "choice" && question.options ? (
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((option) => (
              <Button
                key={option}
                variant={currentAnswer === option ? "default" : "outline"}
                onClick={() => onAnswerChange(option)}
                className="h-auto py-3"
              >
                {option}
              </Button>
            ))}
          </div>
        ) : (
          <>
            {/* hint 快捷选项 */}
            {showHintSuggestions && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  <span>快捷选择（也可以自定义输入）</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hintSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant={
                        currentAnswer === suggestion ? "default" : "secondary"
                      }
                      size="sm"
                      onClick={() => onAnswerChange(suggestion)}
                      className="h-auto py-2 px-3"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Textarea
              value={currentAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="输入你的想法..."
              rows={4}
            />
          </>
        )}
      </div>

      {/* 已回答的问题 */}
      {Object.keys(answers).length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">已回答</Label>
          <div className="space-y-1">
            {Object.entries(answers).map(([step, answer]) => (
              <div
                key={step}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{answer}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 生成中界面
function GeneratingView() {
  return (
    <div className="py-12 text-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
      <p className="text-muted-foreground">AI 正在生成故事雏形，请稍候...</p>
      <p className="text-sm text-muted-foreground">预计需要 30-60 秒</p>
    </div>
  );
}

// 结果界面
function ResultView({
  draft,
  selectedTitle,
  onSelectTitle,
}: {
  draft: StoryDraft;
  selectedTitle: string;
  onSelectTitle: (title: string) => void;
}) {
  return (
    <div className="space-y-6 py-4 max-h-[600px] overflow-y-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">故事雏形已生成</h3>
      </div>

      {/* 标题选择 */}
      <div className="space-y-3">
        <Label>选择标题</Label>
        <div className="space-y-2">
          {draft.title_suggestions.map((title) => (
            <Button
              key={title}
              variant={selectedTitle === title ? "default" : "outline"}
              onClick={() => onSelectTitle(title)}
              className="w-full h-auto py-3 text-left justify-start"
            >
              {title}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 故事简介 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          故事简介
        </Label>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {draft.description}
        </p>
      </div>

      <Separator />

      {/* 主角 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          主角
        </Label>
        <Card>
          <CardContent className="pt-4 space-y-2 text-sm">
            <p>
              <strong>姓名：</strong>
              {draft.protagonist.name}
            </p>
            <p>
              <strong>定位：</strong>
              {draft.protagonist.role}
            </p>
            <p>
              <strong>描述：</strong>
              {draft.protagonist.description}
            </p>
            <div>
              <strong>特点：</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {draft.protagonist.traits.map((trait, index) => (
                  <Badge key={index} variant="secondary">
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 世界观 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          世界观
        </Label>
        <div className="space-y-2 text-sm">
          {draft.world_setting.locations.length > 0 && (
            <div>
              <p className="font-medium mb-1">地点：</p>
              {draft.world_setting.locations.map((loc, index) => (
                <p key={index} className="text-muted-foreground ml-2">
                  • {loc.name}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 章节大纲 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          章节大纲（{draft.outline.length} 章）
        </Label>
        <div className="space-y-1 text-sm">
          {draft.outline.slice(0, 5).map((chapter) => (
            <p key={chapter.chapter_number} className="text-muted-foreground">
              {chapter.title}
            </p>
          ))}
          {draft.outline.length > 5 && (
            <p className="text-muted-foreground">
              ... 还有 {draft.outline.length - 5} 章
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
