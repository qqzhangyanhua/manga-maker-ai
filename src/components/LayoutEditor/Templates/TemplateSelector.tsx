"use client";

/**
 * 模板选择器组件
 */

import { useState, useEffect, useCallback } from "react";
import { Grid3X3, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LayoutTemplate {
  id: string;
  name: string;
  category: string;
  thumbnailUrl?: string;
  panelCount: number;
  width: number;
  height: number;
  description?: string;
}

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  selectedTemplateId?: string;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  japanese: "日式漫画",
  american: "美式漫画",
  webtoon: "条漫",
  free: "自由布局",
};

export function TemplateSelector({
  onSelect,
  selectedTemplateId,
  disabled,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("japanese");

  // 获取模板列表
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/templates/layout");
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, templates.length, fetchTemplates]);

  // 按分类分组模板
  const templatesByCategory = templates.reduce<Record<string, LayoutTemplate[]>>(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {}
  );

  const categories = Object.keys(templatesByCategory);

  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Grid3X3 className="h-4 w-4 mr-2" />
          选择模板
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>选择布局模板</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid grid-cols-4 w-full">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {CATEGORY_LABELS[category] || category}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category}>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-3 gap-4 p-4">
                    {templatesByCategory[category]?.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={template.id === selectedTemplateId}
                        onClick={() => handleSelect(template.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: LayoutTemplate;
  isSelected: boolean;
  onClick: () => void;
}

function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <div
      className={cn(
        "relative group cursor-pointer rounded-lg border-2 p-2 transition-all hover:border-primary",
        isSelected ? "border-primary bg-primary/5" : "border-border"
      )}
      onClick={onClick}
    >
      {/* 选中标记 */}
      {isSelected && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}

      {/* 模板缩略图 */}
      <div
        className="bg-muted rounded aspect-[3/4] flex items-center justify-center"
        style={{
          backgroundImage: template.thumbnailUrl
            ? `url(${template.thumbnailUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!template.thumbnailUrl && (
          <TemplatePlaceholder panelCount={template.panelCount} />
        )}
      </div>

      {/* 模板信息 */}
      <div className="mt-2 text-center">
        <div className="text-sm font-medium">{template.name}</div>
        <div className="text-xs text-muted-foreground">
          {template.panelCount} 格 · {template.width}x{template.height}
        </div>
      </div>
    </div>
  );
}

interface TemplatePlaceholderProps {
  panelCount: number;
}

function TemplatePlaceholder({ panelCount }: TemplatePlaceholderProps) {
  // 根据格数生成简单的布局示意图
  const getGridLayout = () => {
    switch (panelCount) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 4:
        return "grid-cols-2 grid-rows-2";
      case 5:
        return "grid-cols-3 grid-rows-2";
      case 6:
        return "grid-cols-3 grid-rows-2";
      default:
        return "grid-cols-3 grid-rows-3";
    }
  };

  return (
    <div className={cn("w-full h-full p-2 grid gap-1", getGridLayout())}>
      {Array.from({ length: Math.min(panelCount, 9) }).map((_, i) => (
        <div key={i} className="bg-background/50 rounded border border-border/50" />
      ))}
    </div>
  );
}
