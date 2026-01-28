"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { novelTheme } from "../../theme";
import type { SearchResult } from "../types";

interface SearchDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectChapter: (chapterId: string) => void
}

export function SearchDialog({
  projectId,
  open,
  onOpenChange,
  onSelectChapter,
}: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const [searchScope, setSearchScope] = useState<"all" | "title" | "outline" | "content">("all")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/novel/projects/${projectId}/search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            scope: searchScope,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("搜索失败")
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error("Search error:", error)
      toast.error("搜索失败，请重试")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // 防抖搜索
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchScope])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>搜索章节</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="输入关键词搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1"
            />
          </div>

          {/* 搜索类型 */}
          <Tabs
            value={searchScope}
            onValueChange={(value) => {
              if (value === "all" || value === "title" || value === "outline" || value === "content") {
                setSearchScope(value);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="title">标题</TabsTrigger>
              <TabsTrigger value="outline">大纲</TabsTrigger>
              <TabsTrigger value="content">内容</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 搜索结果 */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                搜索中...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {query ? "未找到相关结果" : "输入关键词开始搜索"}
              </div>
            ) : (
              results.map((result) => (
                <div
                  key={result.chapterId}
                  className="p-3 rounded-lg border border-purple-500/10 bg-zinc-900/40 hover:bg-purple-500/10 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectChapter(result.chapterId)
                    onOpenChange(false)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          第{result.chapterNumber}章 {result.title}
                        </span>
                        {result.status === "completed" && (
                          <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">
                            已完成
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1 text-sm text-muted-foreground line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: result.highlights[0] || result.matchedText
                        }}
                      />
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{result.wordCount} 字</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                      {result.matchType === "title" && "标题匹配"}
                      {result.matchType === "outline" && "大纲匹配"}
                      {result.matchType === "content" && "内容匹配"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 搜索统计 */}
          {results.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              找到 {results.length} 个结果
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
