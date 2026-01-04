/**
 * 灵感模式 - 欢迎界面
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";

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
