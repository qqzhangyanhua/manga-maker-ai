"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Search, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchResult {
  chapter_id: string;
  project_id: string;
  project_title: string;
  chapter_number: number;
  title: string;
  content_snippet: string;
  word_count: number;
  status: string;
  relevance_score: number;
  created_at: string;
}

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function fetchResults() {
    setLoading(true);
    try {
      const res = await fetch("/api/novel/search/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          page: 1,
          page_size: 20,
          sort_by: "relevance"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotalCount(data.total_count || 0);
      } else {
        console.error("搜索失败:", await res.text());
      }
    } catch (error) {
      console.error("搜索错误:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!query) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mt-20">
            <Search className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-zinc-400">请输入搜索关键词</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-purple-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-purple-300">
              搜索结果
            </h1>
            <p className="text-sm text-zinc-500">
              {loading ? (
                "搜索中..."
              ) : (
                `关键词 "${query}" 找到 ${totalCount} 个结果`
              )}
            </p>
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* 结果列表 */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.chapter_id}
                onClick={() => {
                  router.push(`/novel/${result.project_id}?chapter=${result.chapter_number}`);
                }}
                className="p-6 bg-zinc-900/60 border border-purple-500/10 rounded-lg
                         hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/20
                         transition-all duration-300 cursor-pointer group"
              >
                {/* 标题栏 */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-purple-300 group-hover:text-purple-200">
                    {result.title}
                  </h3>
                  <span className="text-sm text-zinc-500 whitespace-nowrap ml-4">
                    第{result.chapter_number}章
                  </span>
                </div>

                {/* 项目信息 */}
                <p className="text-sm text-zinc-400 mb-3">
                  项目: <span className="text-purple-400">{result.project_title}</span>
                </p>

                {/* 内容片段 */}
                <div
                  className="text-sm text-zinc-300 leading-relaxed mb-3 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: result.content_snippet }}
                />

                {/* 元数据 */}
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>{result.word_count} 字</span>
                  <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                  <span>相关性: {(result.relevance_score * 100).toFixed(0)}%</span>
                  <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs
                    ${result.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}
                  `}>
                    {result.status === 'completed' ? '已完成' : '草稿'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!loading && results.length === 0 && (
          <div className="text-center py-20">
            <Search className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-500 mb-2">
              没有找到相关结果
            </h2>
            <p className="text-zinc-600">
              尝试使用不同的关键词或调整搜索条件
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-6">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
