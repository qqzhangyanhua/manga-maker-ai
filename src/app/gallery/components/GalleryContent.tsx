"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, TrendingUp, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryGrid } from "./GalleryGrid";
import { StyleFilter } from "./StyleFilter";
import type { GalleryListResponse, GallerySortType } from "@/lib/gallery-types";

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
    <div className="container mx-auto px-4 py-8">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">作品画廊</h1>
        <p className="text-muted-foreground">
          探索社区创作的精彩漫画作品，鼠标悬停查看生成提示词
        </p>
      </div>

      {/* 筛选和排序 */}
      <div className="mb-6 space-y-4">
        {/* 风格筛选 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">风格筛选</h3>
          <StyleFilter
            selectedStyleId={selectedStyleId}
            onStyleChange={handleStyleChange}
          />
        </div>

        {/* 排序方式 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold">排序方式</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sort === "latest" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("latest")}
            >
              <Clock className="mr-1 h-3 w-3" />
              最新发布
            </Button>
            <Button
              variant={sort === "popular" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("popular")}
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              热门
            </Button>
            <Button
              variant={sort === "views" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("views")}
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {data.totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                下一页
              </Button>
            </div>
          )}

          {/* 总数统计 */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            共 {data.total} 件作品
          </div>
        </>
      )}
    </div>
  );
}
