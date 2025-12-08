"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { promptExamples, getCategoryName, getCategoryColor, type PromptExample } from "@/config/prompt-examples";

interface PromptExamplesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectExample: (prompt: string) => void;
}

const PromptExamplesDrawer = ({
  open,
  onOpenChange,
  onSelectExample,
}: PromptExamplesDrawerProps) => {
  const [selectedCategory, setSelectedCategory] = useState<PromptExample["category"] | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories: Array<{ id: PromptExample["category"] | "all"; name: string }> = [
    { id: "all", name: "全部" },
    { id: "action", name: "动作场景" },
    { id: "emotion", name: "情感表达" },
    { id: "environment", name: "环境氛围" },
    { id: "dialogue", name: "对话互动" },
  ];

  const filteredExamples = promptExamples.filter((example) => {
    const matchCategory = selectedCategory === "all" || example.category === selectedCategory;
    const matchSearch =
      searchQuery === "" ||
      example.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handleSelectExample = (prompt: string) => {
    onSelectExample(prompt);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Lightbulb className="w-6 h-6 text-accent" />
            优秀描述示例库
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* 搜索和分类 */}
          <div className="space-y-3">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索标题、描述、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border-2 border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* 分类标签 */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 示例列表 */}
          <ScrollArea className="flex-1">
            <div className="grid gap-4 pr-4">
              {filteredExamples.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>没有找到匹配的示例</p>
                </div>
              ) : (
                filteredExamples.map((example) => (
                  <div
                    key={example.id}
                    className="group comic-card p-4 hover:shadow-glow transition-all duration-300 cursor-pointer"
                    onClick={() => handleSelectExample(example.prompt)}
                  >
                    {/* 标题和分类 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-comic text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                          {example.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-semibold border",
                            getCategoryColor(example.category)
                          )}>
                            {getCategoryName(example.category)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectExample(example.prompt);
                        }}
                      >
                        使用此示例
                      </Button>
                    </div>

                    {/* 描述内容 */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3 group-hover:line-clamp-none transition-all">
                      {example.prompt}
                    </p>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-2">
                      {example.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* 提示 */}
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-semibold">小贴士：</span>点击任意示例即可快速应用。你也可以在此基础上修改，创造属于自己的描述！
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromptExamplesDrawer;
