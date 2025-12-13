"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, RefreshCw, Download, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialState } from "./types";

interface TrialResultProps {
  state: TrialState;
  onRetry: () => void;
  onClose: () => void;
}

export function TrialResult({ state, onRetry, onClose }: TrialResultProps) {
  const { result } = state;

  if (!result || !result.panels) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">生成结果为空，请重试</p>
        <Button variant="outline" onClick={onRetry} className="mt-4">
          重新尝试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 成功提示 */}
      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-5 h-5" />
        </div>
        <span className="font-semibold">预览生成完成</span>
      </div>

      {/* 4 格漫画预览 */}
      <div className="grid grid-cols-2 gap-3">
        {result.panels.map((panel) => (
          <div
            key={panel.order}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-border bg-muted"
          >
            {panel.imageUrl ? (
              <Image
                src={panel.imageUrl}
                alt={`第 ${panel.order} 格`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <p className="text-xs text-muted-foreground text-center line-clamp-4">
                  {panel.description}
                </p>
              </div>
            )}
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center font-bold">
              {panel.order}
            </div>
          </div>
        ))}
      </div>

      {/* 原始提示词 */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground italic">
          &ldquo;{state.prompt}&rdquo;
        </p>
      </div>

      {/* 引导注册 */}
      <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-sm font-medium text-foreground">
          喜欢这个效果？注册账号可以：
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            保存并继续编辑这个作品
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            替换角色、修改分镜内容
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            导出高清图片
          </li>
        </ul>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="comic" className="flex-1" asChild>
          <Link href={`/auth/register?trial=${result.trialId}`}>
            <UserPlus className="w-4 h-4 mr-2" />
            注册保存作品
          </Link>
        </Button>
        <Button
          variant="outline"
          onClick={onRetry}
          disabled={state.remainingTrials <= 0}
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          再试一次
          {state.remainingTrials > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({state.remainingTrials})
            </span>
          )}
        </Button>
      </div>

      {/* 下载预览图（可选） */}
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onClose}
        >
          <Download className="w-4 h-4 mr-1" />
          下载预览图
        </Button>
      </div>
    </div>
  );
}
