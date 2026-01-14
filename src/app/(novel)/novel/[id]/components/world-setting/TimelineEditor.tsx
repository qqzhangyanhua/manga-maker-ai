/**
 * 时间线编辑器组件
 */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { TimelineEvent } from "./types";
import { createNewTimelineEvent, IMPORTANCE_OPTIONS } from "./types";

interface TimelineEditorProps {
  timeline: TimelineEvent[];
  onChange: (timeline: TimelineEvent[]) => void;
}

export function TimelineEditor({ timeline, onChange }: TimelineEditorProps) {
  const addTimelineEvent = () => {
    onChange([...timeline, createNewTimelineEvent()]);
  };

  const updateTimelineEvent = (
    index: number,
    field: keyof TimelineEvent,
    value: string
  ) => {
    const newTimeline = [...timeline];
    newTimeline[index] = { ...newTimeline[index], [field]: value };
    onChange(newTimeline);
  };

  const removeTimelineEvent = (index: number) => {
    onChange(timeline.filter((_, i) => i !== index));
  };

  // 按年份排序显示
  const sortedTimeline = [...timeline].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      <Button onClick={addTimelineEvent} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        添加事件
      </Button>
      <div className="space-y-2">
        {sortedTimeline.map((event, sortedIndex) => {
          // 找到原始索引以便更新
          const originalIndex = timeline.findIndex(
            (e) => e.date === event.date && e.event === event.event
          );
          return (
            <Card key={event.id || `timeline-${event.date}-${sortedIndex}`} className="bg-zinc-900/40 border-purple-500/10">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <Input
                    value={event.date}
                    onChange={(e) =>
                      updateTimelineEvent(originalIndex, "date", e.target.value)
                    }
                    placeholder="年份/时期"
                    className="bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
                  />
                  <Input
                    value={event.event}
                    onChange={(e) =>
                      updateTimelineEvent(originalIndex, "event", e.target.value)
                    }
                    placeholder="事件描述"
                    className="col-span-2 bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
                  />
                </div>
                <select
                  value={event.importance}
                  onChange={(e) =>
                    updateTimelineEvent(
                      originalIndex,
                      "importance",
                      e.target.value as "high" | "medium" | "low"
                    )
                  }
                  className="rounded-md border px-3 py-2"
                >
                  {IMPORTANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTimelineEvent(originalIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
