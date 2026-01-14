/**
 * 灵感模式 - 问答界面
 * 重构版本：添加输入验证和字数统计
 */
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Lightbulb, Check, AlertCircle } from "lucide-react";
import { validateStringLength } from "@/lib/error-utils";
import type { Question } from "../types";

// 答案长度限制
const MIN_ANSWER_LENGTH = 2;
const MAX_ANSWER_LENGTH = 500;

interface QuestionViewProps {
  question: Question;
  currentAnswer: string;
  answers: Record<number, string>;
  onAnswerChange: (answer: string) => void;
}

export function QuestionView({
  question,
  currentAnswer,
  answers,
  onAnswerChange,
}: QuestionViewProps) {
  const totalSteps = question.total_steps || 6;

  // 使用后端提供的 suggestions 或作为降级方案解析 hint
  const suggestions = question.suggestions || [];
  const showSuggestions = question.type === "text" && suggestions.length > 0;

  // 验证当前答案
  const validationError = useMemo(() => {
    if (question.type === "text" && currentAnswer.trim().length > 0) {
      return validateStringLength(currentAnswer, MIN_ANSWER_LENGTH, MAX_ANSWER_LENGTH);
    }
    return null;
  }, [currentAnswer, question.type]);

  // 字数统计
  const charCount = currentAnswer.length;
  const isOverLimit = charCount > MAX_ANSWER_LENGTH;
  const isNearLimit = charCount > MAX_ANSWER_LENGTH * 0.8;

  return (
    <div className="space-y-6 py-4">
      {/* 进度指示 */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
            const isActive = step <= question.step;
            return (
              <div
                key={step}
                className={`h-2 w-12 rounded-full transition-colors duration-300 ${
                  isActive ? "bg-purple-500" : "bg-muted"
                }`}
              />
            );
          })}
        </div>
        {/* 进度百分比 */}
        <div className="text-center text-xs text-muted-foreground">
          进度 {Math.round((question.progress ?? (question.step - 1) / totalSteps) * 100)}%
        </div>
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
              {question.hint && (
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
            {/* 快捷选项 */}
            {showSuggestions && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  <span>快捷选择（也可以自定义输入）</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
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
              className={validationError ? "border-red-500" : ""}
            />
            {/* 字数统计和验证提示 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {validationError && (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationError}
                  </span>
                )}
              </div>
              <span
                className={
                  isOverLimit
                    ? "text-red-500 font-medium"
                    : isNearLimit
                    ? "text-purple-400"
                    : "text-muted-foreground"
                }
              >
                {charCount} / {MAX_ANSWER_LENGTH}
              </span>
            </div>
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
