/**
 * 角色状态查看器组件
 * 显示章节结束时的角色状态，帮助用户理解上下文
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Heart, Brain, Package, Users, RefreshCw, Sparkles } from "lucide-react";

interface CharacterState {
  id: string;
  character: {
    id: string;
    name: string;
    reference_image: string | null;
  };
  location: string | null;
  physical_condition: string | null;
  mental_state: string | null;
  key_items: string[];
  relationship_changes: Record<string, string> | null;
  notes: string | null;
}

interface CharacterStatesViewerProps {
  chapterId: string;
  chapterTitle: string;
}

export function CharacterStatesViewer({ chapterId, chapterTitle }: CharacterStatesViewerProps) {
  const [states, setStates] = useState<CharacterState[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  async function loadStates() {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapter/${chapterId}/extract-states`);
      const data = await response.json();

      if (response.ok) {
        setStates(data.states || []);
      } else {
        throw new Error(data.error || "加载失败");
      }
    } catch (error) {
      console.error("Failed to load character states:", error);
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExtractStates() {
    try {
      setExtracting(true);
      toast({
        title: "开始提取",
        description: "AI 正在分析章节内容...",
      });

      const response = await fetch(`/api/chapter/${chapterId}/extract-states`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        toast({
          title: "提取成功",
          description: "角色状态已更新",
        });
        await loadStates();
      } else {
        throw new Error(data.error || "提取失败");
      }
    } catch (error) {
      console.error("Failed to extract character states:", error);
      toast({
        title: "提取失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    loadStates();
  }, [chapterId]);

  if (loading) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-gray-100">章节结束状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 bg-gray-800" />
          <Skeleton className="h-24 bg-gray-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-gray-100">
              章节结束状态：{chapterTitle}
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              帮助AI理解角色在下一章的起始状态
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStates}
              disabled={loading}
              className="border-gray-700 hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractStates}
              disabled={extracting}
              className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              {extracting ? "提取中..." : "AI 提取"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {states.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-4">暂无角色状态记录</p>
            <Button
              variant="outline"
              onClick={handleExtractStates}
              disabled={extracting}
              className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {extracting ? "AI 分析中..." : "使用 AI 自动提取"}
            </Button>
            <p className="text-xs mt-2 text-gray-500">
              提示：生成分镜后可自动提取角色状态
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {states.map((state) => (
              <div
                key={state.id}
                className="border border-gray-800 rounded-lg p-4 bg-gray-800/30"
              >
                <div className="flex items-start gap-4">
                  {state.character.reference_image && (
                    <img
                      src={state.character.reference_image}
                      alt={state.character.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">
                        {state.character.name}
                      </h4>
                      <Badge
                        variant="outline"
                        className="border-gray-700 text-gray-400"
                      >
                        章节末状态
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {state.location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">位置：</span>
                            <span className="text-gray-200 ml-1">
                              {state.location}
                            </span>
                          </div>
                        </div>
                      )}

                      {state.physical_condition && (
                        <div className="flex items-start gap-2">
                          <Heart className="w-4 h-4 text-red-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">身体：</span>
                            <span className="text-gray-200 ml-1">
                              {state.physical_condition}
                            </span>
                          </div>
                        </div>
                      )}

                      {state.mental_state && (
                        <div className="flex items-start gap-2">
                          <Brain className="w-4 h-4 text-purple-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">心理：</span>
                            <span className="text-gray-200 ml-1">
                              {state.mental_state}
                            </span>
                          </div>
                        </div>
                      )}

                      {state.key_items && state.key_items.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 text-yellow-400 mt-0.5" />
                          <div>
                            <span className="text-gray-400">持有物：</span>
                            <span className="text-gray-200 ml-1">
                              {state.key_items.join("、")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {state.relationship_changes &&
                      Object.keys(state.relationship_changes).length > 0 && (
                        <div className="border-t border-gray-700 pt-2 mt-2">
                          <div className="flex items-start gap-2">
                            <Users className="w-4 h-4 text-green-400 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-gray-400 text-sm">
                                关系变化：
                              </span>
                              <div className="mt-1 space-y-1">
                                {Object.entries(state.relationship_changes).map(
                                  ([character, change]) => (
                                    <div
                                      key={character}
                                      className="text-sm text-gray-300"
                                    >
                                      <span className="text-gray-400">
                                        {character}:
                                      </span>{" "}
                                      {change}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {state.notes && (
                      <div className="text-sm text-gray-400 italic border-l-2 border-gray-700 pl-3">
                        备注：{state.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
