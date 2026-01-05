"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface SearchResult {
  chapter_id: string
  chapter_number: number
  title: string
  snippet: string
  relevance: number
  match_type: "title" | "content"
}

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
  const [searchType, setSearchType] = useState<"all" | "title" | "content">("all")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

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
  }, [query, searchType])

  const handleSearch = async () => {
    setLoading(true)

    try {
      const response = await fetch(
        `/api/novel/search/projects/${projectId}?q=${encodeURIComponent(query)}&type=${searchType}`
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
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
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="title">标题</TabsTrigger>
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
                  key={result.chapter_id}
                  className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectChapter(result.chapter_id)
                    onOpenChange(false)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          第{result.chapter_number}章 {result.title}
                        </span>
                      </div>
                      <div
                        className="mt-1 text-sm text-muted-foreground line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: result.snippet }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                      {result.match_type === "title" ? "标题匹配" : "内容匹配"}
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
