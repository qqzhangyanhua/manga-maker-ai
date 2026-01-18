/**
 * AI 生成世界观设定对话框
 */
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, MapPin, Users, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";
import type {
  WorldSetting,
  Location,
  Faction,
  Rule,
  TimelineEvent
} from "./world-setting";
import type { ChapterOutline } from "./types";
import { novelTheme } from "../../theme";

interface GeneratedWorldSetting {
  locations: (Location & { selected: boolean })[];
  factions: (Faction & { selected: boolean })[];
  rules: (Rule & { selected: boolean })[];
  timeline: (TimelineEvent & { selected: boolean })[];
}

interface GenerateWorldSettingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  outlines: ChapterOutline[];
  onGenerated: (worldSetting: WorldSetting) => void;
}

export function GenerateWorldSettingDialog({
  isOpen,
  onClose,
  projectId,
  outlines,
  onGenerated,
}: GenerateWorldSettingDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedWorldSetting, setSuggestedWorldSetting] = useState<GeneratedWorldSetting | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  async function handleAnalyze() {
    if (outlines.length === 0) {
      toast.error("暂无章节内容可供分析");
      return;
    }

    setIsAnalyzing(true);
    try {
      // 提取所有章节的内容和大纲
      const chaptersContext = outlines
        .map((ch) => {
          const content = ch.content || ch.outline;
          return `第${ch.chapterNumber}章《${ch.title}》：\n${content}`;
        })
        .join("\n\n");

      const response = await fetch(
        `/api/novel/projects/${projectId}/analyze-world-setting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chapters_context: chaptersContext,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        // 为所有条目添加 selected 标志（默认全选）
        const worldSetting: GeneratedWorldSetting = {
          locations: (data.locations || []).map((loc: Location) => ({ ...loc, selected: true })),
          factions: (data.factions || []).map((faction: Faction) => ({ ...faction, selected: true })),
          rules: (data.rules || []).map((rule: Rule) => ({ ...rule, selected: true })),
          timeline: (data.timeline || []).map((event: TimelineEvent) => ({ ...event, selected: true })),
        };

        setSuggestedWorldSetting(worldSetting);
        setHasAnalyzed(true);

        const totalCount =
          worldSetting.locations.length +
          worldSetting.factions.length +
          worldSetting.rules.length +
          worldSetting.timeline.length;

        toast.success(`分析完成，发现 ${totalCount} 个世界观设定条目`);
      } else {
        const error = await response.json();
        toast.error(error.error || "分析失败");
      }
    } catch (error) {
      console.error("分析世界观失败:", error);
      toast.error("分析失败，请重试");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleToggleLocation(index: number) {
    if (!suggestedWorldSetting) return;
    const updated = { ...suggestedWorldSetting };
    updated.locations[index].selected = !updated.locations[index].selected;
    setSuggestedWorldSetting(updated);
  }

  function handleToggleFaction(index: number) {
    if (!suggestedWorldSetting) return;
    const updated = { ...suggestedWorldSetting };
    updated.factions[index].selected = !updated.factions[index].selected;
    setSuggestedWorldSetting(updated);
  }

  function handleToggleRule(index: number) {
    if (!suggestedWorldSetting) return;
    const updated = { ...suggestedWorldSetting };
    updated.rules[index].selected = !updated.rules[index].selected;
    setSuggestedWorldSetting(updated);
  }

  function handleToggleTimeline(index: number) {
    if (!suggestedWorldSetting) return;
    const updated = { ...suggestedWorldSetting };
    updated.timeline[index].selected = !updated.timeline[index].selected;
    setSuggestedWorldSetting(updated);
  }

  function handleConfirm() {
    if (!suggestedWorldSetting) return;

    const selectedWorldSetting: WorldSetting = {
      locations: suggestedWorldSetting.locations
        .filter((loc) => loc.selected)
        .map(({ selected, ...rest }) => rest),
      factions: suggestedWorldSetting.factions
        .filter((faction) => faction.selected)
        .map(({ selected, ...rest }) => rest),
      rules: suggestedWorldSetting.rules
        .filter((rule) => rule.selected)
        .map(({ selected, ...rest }) => rest),
      timeline: suggestedWorldSetting.timeline
        .filter((event) => event.selected)
        .map(({ selected, ...rest }) => rest),
    };

    onGenerated(selectedWorldSetting);
    handleClose();
  }

  function handleClose() {
    setHasAnalyzed(false);
    setSuggestedWorldSetting(null);
    onClose();
  }

  const selectedCount = suggestedWorldSetting
    ? suggestedWorldSetting.locations.filter((loc) => loc.selected).length +
    suggestedWorldSetting.factions.filter((faction) => faction.selected).length +
    suggestedWorldSetting.rules.filter((rule) => rule.selected).length +
    suggestedWorldSetting.timeline.filter((event) => event.selected).length
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>AI 智能生成世界观设定</DialogTitle>
          <DialogDescription>
            基于章节内容，AI 将分析并生成世界观设定，包括地点、派系、规则、时间线等
          </DialogDescription>
        </DialogHeader>

        {!hasAnalyzed ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Sparkles className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              点击"开始分析"按钮，AI 将分析章节内容并生成世界观设定建议
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} className={novelTheme.button.primary}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始分析
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-6 pr-4">
                {/* 地点 */}
                {suggestedWorldSetting && suggestedWorldSetting.locations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">地点 ({suggestedWorldSetting.locations.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {suggestedWorldSetting.locations.map((location, index) => (
                        <Card key={`location-${location.name}-${index}`} className="bg-zinc-900/40 border-purple-500/10">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={location.selected}
                                onCheckedChange={() => handleToggleLocation(index)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{location.name}</h4>
                                  <Badge variant="outline">{location.type}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {location.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 派系 */}
                {suggestedWorldSetting && suggestedWorldSetting.factions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">派系 ({suggestedWorldSetting.factions.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {suggestedWorldSetting.factions.map((faction, index) => (
                        <Card key={`faction-${faction.name}-${index}`} className="bg-zinc-900/40 border-purple-500/10">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={faction.selected}
                                onCheckedChange={() => handleToggleFaction(index)}
                              />
                              <div className="flex-1">
                                <h4 className="font-medium">{faction.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {faction.description}
                                </p>
                                {faction.leader && (
                                  <p className="text-sm mt-1">
                                    <span className="text-muted-foreground">领导者：</span>
                                    {faction.leader}
                                  </p>
                                )}
                                {faction.members && faction.members.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {faction.members.map((member, i) => (
                                      <Badge key={`member-${member}-${i}`} variant="secondary" className="text-xs">
                                        {member}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 规则 */}
                {suggestedWorldSetting && suggestedWorldSetting.rules.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">规则 ({suggestedWorldSetting.rules.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {suggestedWorldSetting.rules.map((rule, index) => (
                        <Card key={`rule-${rule.title}-${index}`} className="bg-zinc-900/40 border-purple-500/10">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={rule.selected}
                                onCheckedChange={() => handleToggleRule(index)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{rule.title}</h4>
                                  <Badge variant="outline">{rule.category}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {rule.content}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 时间线 */}
                {suggestedWorldSetting && suggestedWorldSetting.timeline.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">时间线 ({suggestedWorldSetting.timeline.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {suggestedWorldSetting.timeline.map((event, index) => (
                        <Card key={`timeline-${event.date}-${index}`} className="bg-zinc-900/40 border-purple-500/10">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={event.selected}
                                onCheckedChange={() => handleToggleTimeline(index)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{event.date}</h4>
                                  <Badge
                                    variant={
                                      event.importance === "high"
                                        ? "default"
                                        : event.importance === "medium"
                                          ? "secondary"
                                          : "outline"
                                    }
                                  >
                                    {event.importance === "high"
                                      ? "重要"
                                      : event.importance === "medium"
                                        ? "一般"
                                        : "次要"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {event.event}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground">
                  已选择 {selectedCount} 个条目
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    取消
                  </Button>
                  <Button onClick={handleConfirm} disabled={selectedCount === 0}>
                    确认添加
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
