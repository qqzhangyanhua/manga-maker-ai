"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  History,
  Pin,
  PinOff,
  MoreVertical,
  Trash2,
  RotateCcw,
  Eye,
  GitCompare,
  Tag,
  Loader2
} from "lucide-react";
import { ProjectVersion, SuccessResponse } from "@/types/template";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VersionHistoryPanelProps {
  projectId: string;
  onRestore?: (versionId: string) => void;
  onCompare?: (versionFromId: string, versionToId: string) => void;
  onViewVersion?: (versionId: string) => void;
}

export function VersionHistoryPanel({
  projectId,
  onRestore,
  onCompare,
  onViewVersion
}: VersionHistoryPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Fetch versions
  const { data, isLoading } = useQuery({
    queryKey: ["project-versions", projectId, page],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/versions?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      const json: SuccessResponse<{
        versions: ProjectVersion[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }> = await response.json();
      return json.data;
    }
  });

  // Pin/unpin version mutation
  const pinMutation = useMutation({
    mutationFn: async ({ versionId, isPinned }: { versionId: string; isPinned: boolean }) => {
      const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned })
      });

      if (!response.ok) {
        throw new Error("Failed to update version");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-versions", projectId] });
      toast({ title: "更新成功" });
    },
    onError: () => {
      toast({ title: "更新失败", variant: "destructive" });
    }
  });

  // Delete version mutation
  const deleteMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete version");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-versions", projectId] });
      toast({ title: "删除成功" });
    },
    onError: (error: Error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    }
  });

  const handleToggleSelect = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        return [prev[1], versionId]; // Replace oldest selection
      }
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && onCompare) {
      onCompare(selectedVersions[0], selectedVersions[1]);
      setSelectedVersions([]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const versions = data?.versions || [];
  const pagination = data?.pagination;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              版本历史
            </CardTitle>
            <CardDescription>
              共 {pagination?.total || 0} 个版本
            </CardDescription>
          </div>
          {selectedVersions.length === 2 && (
            <Button onClick={handleCompare} size="sm">
              <GitCompare className="h-4 w-4 mr-2" />
              对比选中版本
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {versions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">暂无版本记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => {
                const isSelected = selectedVersions.includes(version.id);
                const isSelectable = selectedVersions.length < 2 || isSelected;

                return (
                  <Card
                    key={version.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      isSelected && "ring-2 ring-primary",
                      isSelectable && "hover:shadow-md"
                    )}
                    onClick={() => isSelectable && handleToggleSelect(version.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Version info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              版本 {version.version_number}
                            </Badge>
                            {version.is_pinned && (
                              <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-300">
                                <Pin className="h-3 w-3 mr-1" />
                                已固定
                              </Badge>
                            )}
                            {version.is_auto && !version.label && (
                              <Badge variant="secondary">
                                自动保存
                              </Badge>
                            )}
                            {version.label && (
                              <Badge className="bg-blue-500/10 text-blue-700 border-blue-300">
                                <Tag className="h-3 w-3 mr-1" />
                                {version.label}
                              </Badge>
                            )}
                          </div>

                          {version.change_summary && (
                            <p className="text-sm text-muted-foreground">
                              {version.change_summary}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(version.created_at), "yyyy-MM-dd HH:mm:ss", { locale: zhCN })}
                            </span>
                            {version.created_by_action && (
                              <span className="flex items-center gap-1">
                                <span className="text-muted-foreground/70">触发:</span>
                                {version.created_by_action}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewVersion?.(version.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRestore?.(version.id)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              恢复此版本
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => pinMutation.mutate({
                                versionId: version.id,
                                isPinned: !version.is_pinned
                              })}
                            >
                              {version.is_pinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  取消固定
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-2" />
                                  固定版本
                                </>
                              )}
                            </DropdownMenuItem>
                            {!version.is_pinned && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteMutation.mutate(version.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除版本
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              上一页
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              第 {page} / {pagination.totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
