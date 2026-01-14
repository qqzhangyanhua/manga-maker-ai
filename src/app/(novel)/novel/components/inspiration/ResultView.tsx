/**
 * 灵感模式 - 结果展示界面
 * 优化版本：完整世界观展示、可展开章节大纲
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Check,
  FileText,
  User as UserIcon,
  Globe,
  BookOpen,
  MapPin,
  Users,
  ScrollText,
  Clock,
  ChevronDown,
  ChevronRight,
  Star,
} from "lucide-react";
import type { StoryDraft } from "../types";

interface ResultViewProps {
  draft: StoryDraft;
  selectedTitle: string;
  onSelectTitle: (title: string) => void;
}

export function ResultView({
  draft,
  selectedTitle,
  onSelectTitle,
}: ResultViewProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());

  const toggleChapter = (chapterNumber: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterNumber)) {
        next.delete(chapterNumber);
      } else {
        next.add(chapterNumber);
      }
      return next;
    });
  };

  const expandAllChapters = () => {
    setExpandedChapters(new Set(draft.outline.map((c) => c.chapter_number)));
  };

  const collapseAllChapters = () => {
    setExpandedChapters(new Set());
  };

  return (
    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold">故事雏形已生成</h3>
      </div>

      {/* 标题选择 */}
      <div className="space-y-3">
        <Label>选择标题</Label>
        <div className="space-y-2">
          {draft.title_suggestions.map((title) => (
            <Button
              key={title}
              variant={selectedTitle === title ? "default" : "outline"}
              onClick={() => onSelectTitle(title)}
              className="w-full h-auto py-3 text-left justify-start"
            >
              {title}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* 故事简介 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          故事简介
        </Label>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {draft.description}
        </p>
      </div>

      <Separator />

      {/* 主角 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          主角
        </Label>
        <Card>
          <CardContent className="pt-4 space-y-2 text-sm">
            <p>
              <strong>姓名：</strong>
              {draft.protagonist.name}
            </p>
            <p>
              <strong>定位：</strong>
              {draft.protagonist.role}
            </p>
            <p>
              <strong>描述：</strong>
              {draft.protagonist.description}
            </p>
            {draft.protagonist.appearance && (
              <p>
                <strong>外貌：</strong>
                {draft.protagonist.appearance}
              </p>
            )}
            {draft.protagonist.background && (
              <p>
                <strong>背景：</strong>
                {draft.protagonist.background}
              </p>
            )}
            <div>
              <strong>特点：</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {draft.protagonist.traits.map((trait, index) => (
                  <Badge key={index} variant="secondary">
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 世界观 - 完整展示 */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          世界观
        </Label>

        <div className="space-y-4 text-sm">
          {/* 地点 */}
          {draft.world_setting.locations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>主要地点</span>
              </div>
              <div className="grid gap-2 pl-5">
                {draft.world_setting.locations.map((loc, index) => (
                  <div key={index} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{loc.name}</span>
                    {loc.description && (
                      <span className="ml-2">- {loc.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 派系/组织 */}
          {draft.world_setting.factions && draft.world_setting.factions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>派系/组织</span>
              </div>
              <div className="grid gap-2 pl-5">
                {draft.world_setting.factions.map((faction, index) => (
                  <div key={index} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{faction.name}</span>
                    {faction.description && (
                      <span className="ml-2">- {faction.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 规则 */}
          {draft.world_setting.rules && draft.world_setting.rules.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-muted-foreground">
                <ScrollText className="h-3.5 w-3.5" />
                <span>世界规则</span>
              </div>
              <div className="grid gap-2 pl-5">
                {draft.world_setting.rules.map((rule, index) => (
                  <div key={index} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{rule.name}</span>
                    {rule.description && (
                      <span className="ml-2">- {rule.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间线 */}
          {draft.world_setting.timeline && draft.world_setting.timeline.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>重要事件</span>
              </div>
              <div className="grid gap-2 pl-5">
                {draft.world_setting.timeline.map((event, index) => (
                  <div key={index} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{event.time}</span>
                    <span className="ml-2">- {event.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 章节大纲 - 可展开 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            章节大纲（{draft.outline.length} 章）
          </Label>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAllChapters}
              className="h-7 text-xs"
            >
              展开全部
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAllChapters}
              className="h-7 text-xs"
            >
              收起全部
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {draft.outline.map((chapter) => (
            <Collapsible
              key={chapter.chapter_number}
              open={expandedChapters.has(chapter.chapter_number)}
              onOpenChange={() => toggleChapter(chapter.chapter_number)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 w-full">
                    {expandedChapters.has(chapter.chapter_number) ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-sm text-left flex-1 truncate">
                      {chapter.title}
                    </span>
                    {chapter.is_key_chapter && (
                      <Star className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-9 pr-3 pb-3 space-y-2 text-sm text-muted-foreground">
                  {chapter.outline && (
                    <p className="leading-relaxed">{chapter.outline}</p>
                  )}
                  {chapter.key_events && chapter.key_events.length > 0 && (
                    <div>
                      <span className="font-medium text-foreground">关键事件：</span>
                      <ul className="list-disc list-inside mt-1">
                        {chapter.key_events.map((event, i) => (
                          <li key={i}>{event}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {chapter.characters && chapter.characters.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="font-medium text-foreground">登场角色：</span>
                      {chapter.characters.map((char, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {char}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}
