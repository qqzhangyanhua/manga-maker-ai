/**
 * 模板选择器组件
 * 显示可用模板列表，支持选择和预览
 */
"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase: string;
  phase_display: string;
  category: string;
  genre: string | null;
  usage_count: number;
}

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onSelect: (template: Template) => void;
}

export function TemplateSelector({
  templates,
  selectedTemplate,
  onSelect,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      (template.description?.toLowerCase().includes(query) ?? false) ||
      template.category.toLowerCase().includes(query)
    );
  });

  // 按分类分组
  const groupedTemplates = filteredTemplates.reduce<Record<string, Template[]>>(
    (acc, template) => {
      const category = template.category || "general";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {}
  );

  // 分类显示名称映射
  const categoryNames: Record<string, string> = {
    inspiration: "灵感收集",
    market: "市场定位",
    positioning: "卖点定位",
    world: "世界观",
    character: "角色设定",
    power_system: "力量体系",
    outline: "大纲制作",
    chapter_outline: "章节大纲",
    golden_three: "黄金三章",
    book_info: "书名简介",
    chapter: "章节创作",
    revision: "修订润色",
    style: "风格优化",
    description: "描写技巧",
    dialogue: "对话设计",
    cool_points: "爽点设计",
    pacing: "节奏把控",
    combat: "战斗场景",
    daily: "日常场景",
    suspense: "悬疑伏笔",
    general: "通用",
  };

  return (
    <div className="flex flex-col h-full">
      {/* 搜索框 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          type="text"
          placeholder="搜索模板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500"
        />
      </div>

      {/* 模板列表 */}
      <ScrollArea className="flex-1 h-[300px] rounded-lg border border-zinc-700 bg-zinc-900/50">
        <div className="p-2 space-y-4">
          {Object.keys(groupedTemplates).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? "未找到匹配的模板" : "暂无可用模板"}
              </p>
            </div>
          ) : (
            Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category}>
                {/* 分类标题 */}
                <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm px-2 py-1 mb-2">
                  <h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    {categoryNames[category] || category}
                  </h5>
                </div>

                {/* 模板卡片 */}
                <div className="space-y-2">
                  {categoryTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => onSelect(template)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all",
                        selectedTemplate?.id === template.id
                          ? "bg-purple-500/20 border-2 border-purple-500"
                          : "bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm truncate">
                            {template.name}
                          </div>
                          {template.description && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                        </div>
                        {template.usage_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <TrendingUp className="h-3 w-3" />
                            {template.usage_count}
                          </div>
                        )}
                      </div>

                      {/* 标签 */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.genre && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30"
                          >
                            {template.genre}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 选中提示 */}
      {selectedTemplate && (
        <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">
              已选择: {selectedTemplate.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
