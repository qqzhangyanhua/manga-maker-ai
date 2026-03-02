"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Image as ImageIcon, Loader2, RefreshCw, Search, ArrowLeft, Filter, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type GeneratedImageItem = {
  id: string;
  image_url: string;
  prompt: string;
  style?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  character_id?: string | null;
  created_at?: string;
};

export type GeneratedPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const LIMIT = 20;

interface GeneratedGalleryPageClientProps {
  initialImages: GeneratedImageItem[];
  initialPagination: GeneratedPagination | null;
}

export default function GeneratedGalleryPageClient({
  initialImages,
  initialPagination,
}: GeneratedGalleryPageClientProps) {
  const { toast } = useToast();
  const initializedRef = useRef(false);
  const [images, setImages] = useState<GeneratedImageItem[]>(initialImages);
  const [pagination, setPagination] = useState<GeneratedPagination | null>(initialPagination);
  const [page, setPage] = useState(initialPagination?.page ?? 1);
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState("");
  const [sourceType, setSourceType] = useState<string>("all");
  const [loading, setLoading] = useState(false);

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

  const sourceOptions = [
    { value: "all", label: "全部来源" },
    { value: "panel", label: "分镜" },
    { value: "character", label: "角色" },
    { value: "pose", label: "姿态" },
    { value: "scene", label: "场景" },
    { value: "other", label: "其他" },
  ];

  const fetchImages = useCallback(async (targetPage: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(LIMIT),
      });
      if (search.trim()) params.set("search", search.trim());
      if (style.trim()) params.set("style", style.trim());
      if (sourceType !== "all") params.set("source_type", sourceType);

      const res = await fetch(`/api/generated-images?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "获取生成记录失败");
      }

      setImages(data.data?.images || []);
      setPagination(data.data?.pagination || null);
    } catch (error) {
      console.error(error);
      toast({
        title: "获取生成记录失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceType, style, toast]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    void fetchImages(page);
  }, [fetchImages, page]);

  const handleSearch = () => {
    setPage(1);
    void fetchImages(1);
  };

  const buildSourceLink = (img: GeneratedImageItem) => {
    if (!img.source_type || !img.source_id) return null;
    switch (img.source_type) {
      case "panel":
        return `/projects?panel_id=${img.source_id}`;
      case "character":
        return `/assets?character_id=${img.source_id}`;
      case "scene":
        return `/assets?scene_id=${img.source_id}`;
      case "pose":
        return `/assets?pose_id=${img.source_id}`;
      default:
        return null;
    }
  };

  const isFirstPage = useMemo(() => pagination?.page === 1, [pagination]);
  const isLastPage = useMemo(
    () => pagination && pagination.page >= (pagination.totalPages || 1),
    [pagination]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1410' }}>
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
              href="/workspace"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回工作台
            </Link>

            <div className="flex items-center justify-between gap-3 mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
                  生成图库
                </h1>
                <p className="text-zinc-300 text-lg">按时间回溯所有生成图片，支持按关键词与风格筛选</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchImages(page)}
                disabled={loading}
                className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border border-zinc-700 rounded-xl bg-zinc-900/60 backdrop-blur-md mb-8 overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
              <div className="space-y-2 relative z-10">
                <div className="text-xs text-zinc-400 flex items-center gap-1">
                  <Search className="w-4 h-4" />
                  提示词关键词
                </div>
                <Input
                  placeholder="在 prompt 中搜索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2 relative z-10">
                <div className="text-xs text-zinc-400 flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  风格
                </div>
                <Input
                  placeholder="如 manga / webtoon / realistic"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2 relative z-10">
                <div className="text-xs text-zinc-400 flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  来源
                </div>
                <Select value={sourceType} onValueChange={(val) => setSourceType(val)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectValue placeholder="全部来源" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {sourceOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-zinc-800 focus:text-white">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end relative z-10">
                <Button className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20" onClick={handleSearch} disabled={loading}>
                  <Search className="w-4 h-4 mr-2" />
                  查询
                </Button>
              </div>
            </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              加载中...
            </div>
          )}

          {!loading && images.length === 0 && (
            <div className="relative text-center py-16 border border-zinc-700 rounded-2xl bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center ring-2 ring-orange-500/30 mb-4">
                  <ImageIcon className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">暂无生成记录</h3>
                <p className="text-zinc-400">开始创作后，生成的图片会出现在这里</p>
              </div>
            </div>
          )}

          {!loading && images.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {images.map((img) => (
                  <div key={img.id} className="group relative border-zinc-700 rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur-md hover:border-orange-500/50 hover:bg-zinc-900/80 transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1">
                    {/* 顶部高光 */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                    {/* Hover时的内部光晕 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-transparent transition-all duration-300" />

                    <div className="aspect-[4/5] bg-zinc-950 flex items-center justify-center overflow-hidden">
                      {/* 使用原图，避免 Next Image 需额外配置 */}
                      <img
                        src={img.image_url}
                        alt={img.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2 relative z-10">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {img.style || "未标注风格"}
                        </span>
                        {img.created_at && (
                          <span>{format(new Date(img.created_at), "MM-dd HH:mm", { locale: zhCN })}</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 inline-flex items-center gap-2 flex-wrap">
                        {img.source_type ? (
                          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 capitalize">
                            {img.source_type}
                          </span>
                        ) : null}
                        {img.source_id ? <span className="text-zinc-500">ID: {img.source_id}</span> : null}
                        {buildSourceLink(img) && (
                          <Link
                            href={buildSourceLink(img)!}
                            className="inline-flex items-center gap-1 text-orange-500 text-xs hover:underline"
                          >
                            跳转
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-3">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>

              {pagination && (
                <div className="flex items-center justify-between mt-6 text-sm text-zinc-400">
                  <div>
                    第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isFirstPage || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLastPage || loading}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}
