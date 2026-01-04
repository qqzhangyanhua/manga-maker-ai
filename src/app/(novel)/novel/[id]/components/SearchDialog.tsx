"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  snippets: {
    type: "title" | "outline" | "content";
    text: string;
    highlight: boolean;
  }[];
}

interface SearchDialogProps {
  projectId: string;
  onSelectChapter: (chapterId: string) => void;
}

export function SearchDialog({ projectId, onSelectChapter }: SearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "title" | "content">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("请输入搜索关键词");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/novel/projects/${projectId}/search?q=${encodeURIComponent(
          query
        )}&type=${searchType}`
      );

      if (!response.ok) {
        throw new Error("搜索失败");
      }

      const data = await response.json();
      setResults(data.results);

      if (data.results.length === 0) {
        toast.info("未找到相关内容");
      }
    } catch (error) {
      console.error("搜索失败:", error);
      toast.error("搜索失败，请重试");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectChapter = (chapterId: string) => {
    onSelectChapter(chapterId);
    setIsOpen(false);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-900">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="mr-2 h-4 w-4" />
          搜索
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>全文搜索</DialogTitle>
          <DialogDescription>
            搜索章节标题、大纲或正文内容
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索输入 */}
          <div className="flex gap-2">
            <Input
              placeholder="输入关键词..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? "搜索中..." : "搜索"}
            </Button>
          </div>

          {/* 搜索类型 */}
          <div className="flex gap-2">
            <Button
              variant={searchType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("all")}
            >
              全部
            </Button>
            <Button
              variant={searchType === "title" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("title")}
            >
              标题
            </Button>
            <Button
              variant={searchType === "content" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchType("content")}
            >
              正文
            </Button>
          </div>

          {/* 搜索结果 */}
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  输入关键词开始搜索
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  未找到包含 "{query}" 的内容
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  尝试使用其他关键词或搜索类型
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    找到 {results.length} 个结果
                  </span>
                </div>
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-lg border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectChapter(result.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        第 {result.chapter_number} 章
                      </Badge>
                      <h4 className="font-medium">{result.title}</h4>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {result.word_count} 字
                      </span>
                    </div>
                    <div className="space-y-2">
                      {result.snippets.map((snippet, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {snippet.type === "title"
                                ? "标题"
                                : snippet.type === "outline"
                                ? "大纲"
                                : "正文"}
                            </span>
                          </div>
                          <p className="text-muted-foreground pl-5">
                            {highlightText(snippet.text, query)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
