/**
 * 角色状态时间线视图
 * 跨章节追踪角色情绪、服装、位置、物品等状态变化
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  MapPin,
  Heart,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface CharacterState {
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  hasState: boolean;
  location?: string | null;
  physicalCondition?: string | null;
  mentalState?: string | null;
  keyItems?: string[];
  relationshipChanges?: Record<string, string> | null;
  notes?: string | null;
}

interface CharacterTimeline {
  characterId: string;
  characterName: string;
  characterImage: string | null;
  role: string;
  states: CharacterState[];
}

interface CharacterStateTimelineProps {
  storyId: string;
}

export function CharacterStateTimeline({ storyId }: CharacterStateTimelineProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [timelines, setTimelines] = useState<CharacterTimeline[]>([]);
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<{ totalChapters: number; totalCharacters: number; statesExtracted: number } | null>(null);

  const loadCharacterStates = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/story/${storyId}/character-states`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "加载失败");
      }

      setTimelines(data.characterTimelines || []);
      setStats(data.stats);

      // 默认展开第一个角色
      if (data.characterTimelines && data.characterTimelines.length > 0) {
        setExpandedCharacters(new Set([data.characterTimelines[0].characterId]));
      }
    } catch (error) {
      console.error("Failed to load character states:", error);
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [storyId, toast]);

  useEffect(() => {
    loadCharacterStates();
  }, [loadCharacterStates]);

  function toggleCharacter(characterId: string) {
    const newExpanded = new Set(expandedCharacters);
    if (newExpanded.has(characterId)) {
      newExpanded.delete(characterId);
    } else {
      newExpanded.add(characterId);
    }
    setExpandedCharacters(newExpanded);
  }

  function getSeverityColor(condition: string | null | undefined): string {
    if (!condition) return "text-gray-400";
    const lower = condition.toLowerCase();
    if (lower.includes("死亡") || lower.includes("重伤") || lower.includes("濒死")) {
      return "text-red-400";
    }
    if (lower.includes("受伤") || lower.includes("疲惫") || lower.includes("虚弱")) {
      return "text-yellow-400";
    }
    return "text-green-400";
  }

  function getMentalColor(state: string | null | undefined): string {
    if (!state) return "text-gray-400";
    const lower = state.toLowerCase();
    if (lower.includes("绝望") || lower.includes("愤怒") || lower.includes("恐惧") || lower.includes("崩溃")) {
      return "text-red-400";
    }
    if (lower.includes("焦虑") || lower.includes("紧张") || lower.includes("担忧") || lower.includes("压抑")) {
      return "text-yellow-400";
    }
    if (lower.includes("平静") || lower.includes("坚定") || lower.includes("喜悦") || lower.includes("满足")) {
      return "text-green-400";
    }
    return "text-blue-400";
  }

  if (isLoading) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-400 mb-3" />
          <p className="text-gray-400">加载角色状态时间线...</p>
        </CardContent>
      </Card>
    );
  }

  if (!timelines || timelines.length === 0) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-lg text-gray-100 flex items-center gap-2">
            <Users className="w-5 h-5" />
            角色状态时间线
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <p className="mb-4">暂无角色状态数据</p>
            <p className="text-sm text-gray-500">生成分镜后将自动提取角色状态</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5" />
              角色状态时间线
            </CardTitle>
            {stats && (
              <p className="text-sm text-gray-400 mt-1">
                {stats.totalCharacters} 个角色 · {stats.totalChapters} 章节 · {stats.statesExtracted} 条状态记录
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCharacterStates}
            className="border-gray-700 text-gray-400 hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {timelines.map((timeline) => {
          const isExpanded = expandedCharacters.has(timeline.characterId);
          const statesWithData = timeline.states.filter((s) => s.hasState);
          const completionRate = (statesWithData.length / timeline.states.length) * 100;

          return (
            <div
              key={timeline.characterId}
              className="border border-gray-800 rounded-lg bg-gray-800/30"
            >
              {/* 角色头部 */}
              <button
                onClick={() => toggleCharacter(timeline.characterId)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={timeline.characterImage || ""} />
                  <AvatarFallback className="bg-gray-700 text-gray-300">
                    {timeline.characterName.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{timeline.characterName}</h4>
                    <Badge
                      variant="outline"
                      className="text-xs bg-gray-700/50 text-gray-300 border-gray-600"
                    >
                      {timeline.role === "protagonist" && "主角"}
                      {timeline.role === "antagonist" && "反派"}
                      {timeline.role === "supporting" && "配角"}
                      {timeline.role === "minor" && "龙套"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {statesWithData.length}/{timeline.states.length} 章节已记录状态 ({Math.round(completionRate)}%)
                  </p>
                </div>

                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* 展开内容 - 时间线 */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {timeline.states.map((state, index) => (
                    <div
                      key={state.chapterId}
                      className={`pl-4 border-l-2 ${
                        state.hasState ? "border-blue-500" : "border-gray-700"
                      } py-2`}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 ${
                            state.hasState ? "bg-blue-500" : "bg-gray-700"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-300">
                              第 {state.chapterOrder} 章: {state.chapterTitle}
                            </span>
                            {!state.hasState && (
                              <Badge variant="outline" className="text-xs bg-gray-800 text-gray-500 border-gray-700">
                                未记录
                              </Badge>
                            )}
                          </div>

                          {state.hasState && (
                            <div className="space-y-2 mt-2">
                              {/* 位置 */}
                              {state.location && (
                                <div className="flex items-start gap-2 text-xs">
                                  <MapPin className="w-3.5 h-3.5 text-green-400 mt-0.5" />
                                  <span className="text-gray-400">{state.location}</span>
                                </div>
                              )}

                              {/* 身体状况 */}
                              {state.physicalCondition && (
                                <div className="flex items-start gap-2 text-xs">
                                  <Heart className={`w-3.5 h-3.5 mt-0.5 ${getSeverityColor(state.physicalCondition)}`} />
                                  <span className={getSeverityColor(state.physicalCondition)}>
                                    {state.physicalCondition}
                                  </span>
                                </div>
                              )}

                              {/* 心理状态 */}
                              {state.mentalState && (
                                <div className="flex items-start gap-2 text-xs">
                                  <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${getMentalColor(state.mentalState)}`} />
                                  <span className={getMentalColor(state.mentalState)}>
                                    {state.mentalState}
                                  </span>
                                </div>
                              )}

                              {/* 关键物品 */}
                              {state.keyItems && state.keyItems.length > 0 && (
                                <div className="flex items-start gap-2 text-xs">
                                  <Package className="w-3.5 h-3.5 text-purple-400 mt-0.5" />
                                  <span className="text-purple-300">{state.keyItems.join("、")}</span>
                                </div>
                              )}

                              {/* 备注 */}
                              {state.notes && (
                                <div className="text-xs text-gray-500 italic pl-5">
                                  {state.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
