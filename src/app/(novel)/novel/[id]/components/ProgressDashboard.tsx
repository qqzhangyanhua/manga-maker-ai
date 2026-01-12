/**
 * 创作进度仪表盘组件
 *
 * 可视化展示小说项目的创作进度和质量分析
 */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Users,
  Globe,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeProjectProgress } from "@/lib/progress-analyzer";
import type {
  ChapterOutline,
  Character,
  WorldSetting,
} from "../types";
import type { ProgressAnalysis } from "@/lib/progress-analyzer";

interface ProgressDashboardProps {
  outlines: ChapterOutline[];
  characters: Character[];
  worldSetting: WorldSetting | null;
  targetWords?: number | null;
}

export function ProgressDashboard({
  outlines,
  characters,
  worldSetting,
  targetWords,
}: ProgressDashboardProps) {
  const analysis = analyzeProjectProgress(
    outlines,
    characters,
    worldSetting,
    targetWords || null
  );

  return (
    <div className="space-y-6">
      {/* 整体进度 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            整体进度
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>完成度</span>
              <span className="font-medium">{analysis.overall.percentage}%</span>
            </div>
            <Progress value={analysis.overall.percentage} className="h-2" />
          </div>

          {/* 预计剩余时间 */}
          {analysis.overall.estimatedDaysRemaining && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                预计还需 {analysis.overall.estimatedDaysRemaining} 天完成
              </span>
            </div>
          )}

          {/* 章节统计 */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {analysis.overall.chapters.total}
              </div>
              <div className="text-xs text-muted-foreground">总章节</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {analysis.overall.chapters.completed}
              </div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {analysis.overall.chapters.inProgress}
              </div>
              <div className="text-xs text-muted-foreground">进行中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {analysis.overall.chapters.notStarted}
              </div>
              <div className="text-xs text-muted-foreground">未开始</div>
            </div>
          </div>

          {/* 字数进度 */}
          {analysis.overall.wordCount.target && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  字数目标
                </span>
                <span className="text-muted-foreground">
                  {analysis.overall.wordCount.current.toLocaleString()} /{" "}
                  {analysis.overall.wordCount.target?.toLocaleString()}
                </span>
              </div>
              <Progress value={analysis.overall.wordCount.percentage} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详细分析 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 剧情结构 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              剧情结构
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>完整性</span>
                <span className="font-medium">{analysis.plot.percentage}%</span>
              </div>
              <Progress value={analysis.plot.percentage} className="h-1" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {analysis.plot.hasOpening ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>开篇</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.plot.hasDevelopment ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>发展</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.plot.hasClimax ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>高潮</span>
              </div>
              <div className="flex items-center gap-2">
                {analysis.plot.hasResolution ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>结局</span>
              </div>
            </div>

            {analysis.plot.structureType && (
              <div className="pt-2 border-t">
                <Badge variant="secondary" className="text-xs">
                  {analysis.plot.structureType === 'three-act'
                    ? '三幕式结构'
                    : analysis.plot.structureType}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 角色发展 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              角色发展
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>完善度</span>
                <span className="font-medium">{analysis.characters.percentage}%</span>
              </div>
              <Progress value={analysis.characters.percentage} className="h-1" />
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {analysis.characters.characters.map((ch) => (
                  <div
                    key={ch.character.name}
                    className="p-2 rounded border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {ch.character.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {ch.development}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{ch.character.role}</span>
                      <span>•</span>
                      <span>出场 {ch.appearances} 次</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 世界观构建 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-500" />
              世界观
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>完善度</span>
                <span className="font-medium">{analysis.worldBuilding.percentage}%</span>
              </div>
              <Progress value={analysis.worldBuilding.percentage} className="h-1" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">地点</span>
                <span>
                  {analysis.worldBuilding.locations.count} /{" "}
                  {analysis.worldBuilding.locations.recommended}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">势力</span>
                <span>
                  {analysis.worldBuilding.factions.count} /{" "}
                  {analysis.worldBuilding.factions.recommended}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">规则</span>
                <span>
                  {analysis.worldBuilding.rules.count} /{" "}
                  {analysis.worldBuilding.rules.recommended}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 改进建议 */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              改进建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
