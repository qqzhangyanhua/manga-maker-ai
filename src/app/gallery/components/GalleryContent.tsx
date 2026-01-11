"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, TrendingUp, Clock, Eye, ArrowLeft, Filter } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { GalleryGrid } from "./GalleryGrid";
import { StyleFilter } from "./StyleFilter";
import type { GalleryListResponse, GallerySortType } from "@/lib/gallery-types";
import { cn } from "@/lib/utils";

export function GalleryContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<GalleryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(
    searchParams.get("style_id")
  );
  const [sort, setSort] = useState<GallerySortType>(
    (searchParams.get("sort") as GallerySortType) || "latest"
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));

  // 加载画廊数据
  const loadGallery = async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      params.set("sort", sort);
      if (selectedStyleId) {
        params.set("style_id", selectedStyleId);
      }

      const response = await fetch(`/api/gallery?${params.toString()}`);
      const result = (await response.json()) as GalleryListResponse;
      setData(result);
    } catch (error) {
      console.error("Failed to load gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  // 监听参数变化
  useEffect(() => {
    loadGallery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, selectedStyleId]);

  // 更新 URL 参数
  const updateURL = (newSort: GallerySortType, newStyleId: string | null, newPage: number): void => {
    const params = new URLSearchParams();
    params.set("sort", newSort);
    params.set("page", newPage.toString());
    if (newStyleId) {
      params.set("style_id", newStyleId);
    }
    router.push(`/gallery?${params.toString()}`, { scroll: false });
  };

  // 切换风格
  const handleStyleChange = (styleId: string | null): void => {
    setSelectedStyleId(styleId);
    setPage(1);
    updateURL(sort, styleId, 1);
  };

  // 切换排序
  const handleSortChange = (newSort: GallerySortType): void => {
    setSort(newSort);
    setPage(1);
    updateURL(newSort, selectedStyleId, 1);
  };

  // 切换页码
  const handlePageChange = (newPage: number): void => {
    setPage(newPage);
    updateURL(sort, selectedStyleId, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] text-foreground">
      <Navbar />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        {/* 装饰性光晕 */}
        <div className="fixed top-0 left-0 w-full h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none select-none" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] pointer-events-none select-none" />

        <div className="max-w-[1600px] mx-auto relative">
          
          {/* 头部区域 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
             <div>
                 <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                    作品画廊 <span className="text-orange-500">.</span>
                 </h1>
                 <p className="text-zinc-400 text-lg">
                    探索社区创作的精彩漫画作品，汲取灵感
                 </p>
             </div>
             
             {/* 排序按钮组 */}
             <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 backdrop-blur-md">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSortChange("latest")}
                    className={cn(
                        "rounded-lg px-4 hover:bg-zinc-800 hover:text-white transition-all",
                        sort === "latest" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400"
                    )}
                >
                    <Clock className="mr-2 h-3.5 w-3.5" />
                    最新
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSortChange("popular")}
                    className={cn(
                        "rounded-lg px-4 hover:bg-zinc-800 hover:text-white transition-all",
                        sort === "popular" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400"
                    )}
                >
                    <TrendingUp className="mr-2 h-3.5 w-3.5" />
                    热门
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSortChange("views")}
                    className={cn(
                        "rounded-lg px-4 hover:bg-zinc-800 hover:text-white transition-all",
                        sort === "views" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400"
                    )}
                >
                    <Eye className="mr-2 h-3.5 w-3.5" />
                    浏览
                </Button>
             </div>
          </div>

          {/* 筛选区域 */}
          <div className="mb-8 flex items-center gap-3">
             <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400">
                <Filter className="w-4 h-4" />
             </div>
             <StyleFilter
                selectedStyleId={selectedStyleId}
                onStyleChange={handleStyleChange}
            />
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
          )}

          {/* 画廊网格 */}
          {!loading && data && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <GalleryGrid items={data.items} />

              {/* 分页 */}
              {data.totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => handlePageChange(page - 1)}
                    className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 px-6"
                  >
                    上一页
                  </Button>
                  <span className="text-sm font-mono text-zinc-500 px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
                    {page} / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page === data.totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 px-6"
                  >
                    下一页
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
