"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GitCompare,
  ArrowRight,
  Plus,
  Minus,
  Edit,
  Loader2,
  AlertCircle
} from "lucide-react";
import { CompareVersionsResponse, SuccessResponse } from "@/types/template";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface VersionCompareViewProps {
  projectId: string;
  versionFromId: string;
  versionToId: string;
}

export function VersionCompareView({
  projectId,
  versionFromId,
  versionToId
}: VersionCompareViewProps) {
  // Fetch comparison data
  const { data, isLoading, error } = useQuery({
    queryKey: ["version-compare", projectId, versionFromId, versionToId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/versions/compare?from=${versionFromId}&to=${versionToId}`
      );
      if (!response.ok) {
        throw new Error("Failed to compare versions");
      }
      const json: SuccessResponse<CompareVersionsResponse> = await response.json();
      return json.data;
    },
    enabled: !!versionFromId && !!versionToId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              加载对比数据失败，请重试
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { versionFrom, versionTo, diff } = data;
  const hasProjectChanges = diff.project.changed.length > 0;
  const hasPanelChanges =
    diff.panels.added.length > 0 ||
    diff.panels.removed.length > 0 ||
    diff.panels.modified.length > 0;

  const totalChanges =
    diff.project.changed.length +
    diff.panels.added.length +
    diff.panels.removed.length +
    diff.panels.modified.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          版本对比
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Version headers */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1">
            <CardContent className="pt-4">
              <div className="text-center space-y-1">
                <Badge variant="outline">版本 {versionFrom.version_number}</Badge>
                {versionFrom.label && (
                  <p className="text-sm font-medium">{versionFrom.label}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(versionFrom.created_at).toLocaleString("zh-CN")}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-muted-foreground" />
          </div>

          <Card className="col-span-1">
            <CardContent className="pt-4">
              <div className="text-center space-y-1">
                <Badge variant="outline">版本 {versionTo.version_number}</Badge>
                {versionTo.label && (
                  <p className="text-sm font-medium">{versionTo.label}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(versionTo.created_at).toLocaleString("zh-CN")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Alert>
          <GitCompare className="h-4 w-4" />
          <AlertDescription>
            共发现 <strong>{totalChanges}</strong> 处变化
            {!hasProjectChanges && !hasPanelChanges && " (无变化)"}
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Project changes */}
            {hasProjectChanges && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  项目信息变更 ({diff.project.changed.length})
                </h3>
                <div className="space-y-2">
                  {diff.project.changed.map((field) => (
                    <Card key={field} className="p-3">
                      <div className="space-y-2">
                        <Badge variant="secondary">{getFieldLabel(field)}</Badge>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">原值:</p>
                            <p className={cn(
                              "p-2 rounded bg-red-500/10 border border-red-500/20",
                              "break-words"
                            )}>
                              {String(diff.project.values.from[field] ?? "(空)")}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">新值:</p>
                            <p className={cn(
                              "p-2 rounded bg-green-500/10 border border-green-500/20",
                              "break-words"
                            )}>
                              {String(diff.project.values.to[field] ?? "(空)")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Panel changes */}
            {hasPanelChanges && (
              <div className="space-y-4">
                <Separator />

                {/* Added panels */}
                {diff.panels.added.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-green-700">
                      <Plus className="h-4 w-4" />
                      新增分镜 ({diff.panels.added.length})
                    </h3>
                    <div className="space-y-2">
                      {diff.panels.added.map((panel: any, index: number) => (
                        <Card key={index} className="p-3 border-green-500/20 bg-green-500/5">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500">+ 新增</Badge>
                              <span className="text-sm">分镜 {panel.panel_order}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {panel.description}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed panels */}
                {diff.panels.removed.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-red-700">
                      <Minus className="h-4 w-4" />
                      删除分镜 ({diff.panels.removed.length})
                    </h3>
                    <div className="space-y-2">
                      {diff.panels.removed.map((panel: any, index: number) => (
                        <Card key={index} className="p-3 border-red-500/20 bg-red-500/5">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">- 删除</Badge>
                              <span className="text-sm">分镜 {panel.panel_order}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {panel.description}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modified panels */}
                {diff.panels.modified.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-700">
                      <Edit className="h-4 w-4" />
                      修改分镜 ({diff.panels.modified.length})
                    </h3>
                    <div className="space-y-2">
                      {diff.panels.modified.map((item) => (
                        <Card key={item.panelId} className="p-3 border-blue-500/20 bg-blue-500/5">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-500">修改</Badge>
                              <span className="text-sm">分镜 {item.panelId}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.changes.map((field) => (
                                <Badge key={field} variant="outline" className="text-xs">
                                  {getFieldLabel(field)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No changes */}
            {!hasProjectChanges && !hasPanelChanges && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">两个版本无差异</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper function to get field labels
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: "标题",
    description: "描述",
    style: "风格",
    panel_type: "类型",
    importance: "重要性",
    camera_angle: "镜头角度",
    shot_size: "景别",
    dialogue: "对白",
    character_name: "角色名称",
    emotion: "情绪",
    generated_image: "生成图片",
    prompt_used: "提示词",
    panel_order: "顺序"
  };
  return labels[field] || field;
}
