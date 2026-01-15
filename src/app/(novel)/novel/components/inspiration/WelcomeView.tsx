/**
 * 灵感模式 - 欢迎界面
 * 优化版本：动态问题数展示
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Lightbulb, MessageSquare, Wand2, FolderPlus } from "lucide-react";
import { novelTheme } from "../../theme";

interface WelcomeViewProps {
  onStart: () => void;
  isLoading: boolean;
}

export function WelcomeView({ onStart, isLoading }: WelcomeViewProps) {
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
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-3.5 w-3.5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="font-medium">回答引导问题</p>
              <p className="text-muted-foreground">关于故事类型、主题、角色等</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center flex-shrink-0">
              <Wand2 className="h-3.5 w-3.5 text-pink-600 dark:text-pink-300" />
            </div>
            <div>
              <p className="font-medium">AI 生成故事框架</p>
              <p className="text-muted-foreground">包含大纲、角色、世界观</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <FolderPlus className="h-3.5 w-3.5 text-orange-600 dark:text-orange-300" />
            </div>
            <div>
              <p className="font-medium">一键创建项目</p>
              <p className="text-muted-foreground">开始你的创作之旅</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={onStart} disabled={isLoading} size="lg" className={novelTheme.button.primary}>
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
