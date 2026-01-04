/**
 * 灵感模式 - 结果展示界面
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  FileText,
  User as UserIcon,
  Globe,
  BookOpen,
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
  return (
    <div className="space-y-6 py-4 max-h-[600px] overflow-y-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
          <Check className="h-6 w-6 text-green-600" />
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

      {/* 世界观 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          世界观
        </Label>
        <div className="space-y-2 text-sm">
          {draft.world_setting.locations.length > 0 && (
            <div>
              <p className="font-medium mb-1">地点：</p>
              {draft.world_setting.locations.map((loc, index) => (
                <p key={index} className="text-muted-foreground ml-2">
                  • {loc.name}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* 章节大纲 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          章节大纲（{draft.outline.length} 章）
        </Label>
        <div className="space-y-1 text-sm">
          {draft.outline.slice(0, 5).map((chapter) => (
            <p key={chapter.chapter_number} className="text-muted-foreground">
              {chapter.title}
            </p>
          ))}
          {draft.outline.length > 5 && (
            <p className="text-muted-foreground">
              ... 还有 {draft.outline.length - 5} 章
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
