/**
 * 灵感模式对话框 - AI 对话式故事构建
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  Bot,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface InspirationModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

interface Question {
  step: number;
  question: string;
  type: "choice" | "text";
  options?: string[];
  hint: string;
  is_last?: boolean;
}

interface StoryDraft {
  title_suggestions: string[];
  description: string;
  protagonist: {
    name: string;
    role: string;
    description: string;
    traits: string[];
    appearance: string;
    background: string;
  };
  world_setting: {
    locations: Array<{ name: string; description: string }>;
    factions: Array<{ name: string; description: string }>;
    rules: Array<{ name: string; description: string }>;
    timeline: Array<{ time: string; event: string }>;
  };
  outline: Array<{
    chapter_number: number;
    title: string;
    outline: string;
    key_events: string[];
    characters: string[];
    plot_lines: string[];
    is_key_chapter: boolean;
  }>;
}

export function InspirationModeDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: InspirationModeDialogProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [storyDraft, setStoryDraft] = useState<StoryDraft | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");

  // 开始灵感模式
  async function handleStart() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/novel/inspiration/start", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id);
        setCurrentQuestion(data);
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
    if (!currentAnswer.trim()) {
      toast.error("请先回答当前问题");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/novel/inspiration/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          answer: currentAnswer,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // 保存答案
        if (currentQuestion) {
          setAnswers((prev) => ({
            ...prev,
            [currentQuestion.step]: currentAnswer,
          }));
        }

        // 清空输入
        setCurrentAnswer("");

        // 更新问题
        if (data.is_last) {
          // 所有问题已完成，开始生成
          await handleGenerate();
        } else {
          setCurrentQuestion(data);
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

  // 生成故事雏形
  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/novel/inspiration/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStoryDraft(data);
        setSelectedTitle(data.title_suggestions[0]);
        toast.success("故事雏形生成成功");
      } else {
        const error = await response.json();
        toast.error(error.detail || "生成失败");
      }
    } catch (error) {
      console.error("生成故事雏形失败:", error);
      toast.error("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }

  // 创建项目
  async function handleCreateProject() {
    if (!selectedTitle) {
      toast.error("请选择一个标题");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/novel/inspiration/create-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          selected_title: selectedTitle,
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

  // 关闭对话框
  function handleClose() {
    setSessionId(null);
    setCurrentQuestion(null);
    setCurrentAnswer("");
    setAnswers({});
    setStoryDraft(null);
    setSelectedTitle("");
    onClose();
  }

  // 渲染欢迎界面
  function renderWelcome() {
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
            <CardTitle className="text-base">💡 如何使用</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. 回答 6 个简单问题（类型、主题、主角等）</p>
            <p>2. AI 根据你的回答生成完整的故事框架</p>
            <p>3. 选择喜欢的标题，一键创建项目</p>
            <p>4. 开始你的创作之旅</p>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={handleStart} disabled={isLoading} size="lg">
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

  // 渲染问题界面
  function renderQuestion() {
    if (!currentQuestion) return null;

    return (
      <div className="space-y-6 py-4">
        {/* 进度指示 */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`h-2 w-12 rounded-full ${
                step < currentQuestion.step
                  ? "bg-purple-500"
                  : step === currentQuestion.step
                  ? "bg-purple-500"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <Badge variant="outline" className="mb-2">
            步骤 {currentQuestion.step}/6
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
                <p className="font-medium">{currentQuestion.question}</p>
                {currentQuestion.hint && (
                  <p className="text-sm text-muted-foreground">
                    💡 {currentQuestion.hint}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 用户回答 */}
        <div className="space-y-3">
          <Label>你的回答</Label>
          {currentQuestion.type === "choice" && currentQuestion.options ? (
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((option) => (
                <Button
                  key={option}
                  variant={currentAnswer === option ? "default" : "outline"}
                  onClick={() => setCurrentAnswer(option)}
                  className="h-auto py-3"
                >
                  {option}
                </Button>
              ))}
            </div>
          ) : (
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="输入你的想法..."
              rows={4}
            />
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

  // 渲染生成结果
  function renderResult() {
    if (!storyDraft) return null;

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
            {storyDraft.title_suggestions.map((title) => (
              <Button
                key={title}
                variant={selectedTitle === title ? "default" : "outline"}
                onClick={() => setSelectedTitle(title)}
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
          <Label>📝 故事简介</Label>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {storyDraft.description}
          </p>
        </div>

        <Separator />

        {/* 主角 */}
        <div className="space-y-2">
          <Label>👤 主角</Label>
          <Card>
            <CardContent className="pt-4 space-y-2 text-sm">
              <p>
                <strong>姓名：</strong>
                {storyDraft.protagonist.name}
              </p>
              <p>
                <strong>定位：</strong>
                {storyDraft.protagonist.role}
              </p>
              <p>
                <strong>描述：</strong>
                {storyDraft.protagonist.description}
              </p>
              <div>
                <strong>特点：</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {storyDraft.protagonist.traits.map((trait, index) => (
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
          <Label>🌍 世界观</Label>
          <div className="space-y-2 text-sm">
            {storyDraft.world_setting.locations.length > 0 && (
              <div>
                <p className="font-medium mb-1">地点：</p>
                {storyDraft.world_setting.locations.map((loc, index) => (
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
          <Label>📚 章节大纲（{storyDraft.outline.length} 章）</Label>
          <div className="space-y-1 text-sm">
            {storyDraft.outline.slice(0, 5).map((chapter) => (
              <p key={chapter.chapter_number} className="text-muted-foreground">
                {chapter.title}
              </p>
            ))}
            {storyDraft.outline.length > 5 && (
              <p className="text-muted-foreground">
                ... 还有 {storyDraft.outline.length - 5} 章
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            灵感模式
          </DialogTitle>
          <DialogDescription>
            {!sessionId && "AI 对话式引导，帮你构建故事雏形"}
            {sessionId && !storyDraft && "回答几个简单问题"}
            {storyDraft && "查看生成的故事框架"}
          </DialogDescription>
        </DialogHeader>

        {!sessionId && renderWelcome()}
        {sessionId && !storyDraft && !isGenerating && renderQuestion()}
        {isGenerating && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-500" />
            <p className="text-muted-foreground">
              AI 正在生成故事雏形，请稍候...
            </p>
            <p className="text-sm text-muted-foreground">
              预计需要 30-60 秒
            </p>
          </div>
        )}
        {storyDraft && renderResult()}

        <DialogFooter>
          {currentQuestion && !storyDraft && (
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
          )}
          {storyDraft && (
            <>
              <Button variant="outline" onClick={() => setStoryDraft(null)}>
                重新生成
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
