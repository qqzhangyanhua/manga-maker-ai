"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, TrendingUp, Clock, Eye, ArrowLeft } from "lucide-react";
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

  // Spotlight effect state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition(null);
  }, []);

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
    <div className="min-h-screen bg-[#0f0f13]">
      <Navbar />

      <main className="pt-16">
        {/* 装饰性光晕 */}
        <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

        <div
          ref={containerRef}
          className="relative px-4 py-12"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Global Spotlight Overlay */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
              isHovering ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: mousePosition
                ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
                : "none",
            }}
          />

          <div className="max-w-7xl mx-auto relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>

            {/* 标题 */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                作品画廊
              </h1>
              <p className="text-zinc-300 text-lg">
                探索社区创作的精彩漫画作品，鼠标悬停查看生成提示词
              </p>
            </div>

            {/* 筛选和排序 */}
            <div className="mb-6 space-y-4">
              {/* 风格筛选 */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-white">风格筛选</h3>
                <StyleFilter
                  selectedStyleId={selectedStyleId}
                  onStyleChange={handleStyleChange}
                />
              </div>

              {/* 排序方式 */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-white">排序方式</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={sort === "latest" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange("latest")}
                    className={sort === "latest" ? "bg-orange-500 hover:bg-orange-600 text-white border-0" : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    最新发布
                  </Button>
                  <Button
                    variant={sort === "popular" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange("popular")}
                    className={sort === "popular" ? "bg-orange-500 hover:bg-orange-600 text-white border-0" : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"}
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    热门
                  </Button>
                  <Button
                    variant={sort === "views" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange("views")}
                    className={sort === "views" ? "bg-orange-500 hover:bg-orange-600 text-white border-0" : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    浏览量
                  </Button>
                </div>
              </div>
            </div>

            {/* 加载状态 */}
            {loading && (
              <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            )}

            {/* 画廊网格 */}
            {!loading && data && (
              <>
                <GalleryGrid items={data.items} />

                {/* 分页 */}
                {data.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                      className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-zinc-400">
                      第 {page} / {data.totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === data.totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                    >
                      下一页
                    </Button>
                  </div>
                )}

                {/* 总数统计 */}
                <div className="mt-4 text-center text-sm text-zinc-400">
                  共 {data.total} 件作品
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
