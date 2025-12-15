"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Image as ImageIcon, Loader2, RefreshCw, Search, ArrowLeft, Filter, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type GeneratedImage = {
  id: string;
  image_url: string;
  prompt: string;
  style?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  character_id?: string | null;
  created_at?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const LIMIT = 20;

export default function GeneratedGalleryPage() {
  const { toast } = useToast();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState("");
  const [sourceType, setSourceType] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const sourceOptions = [
    { value: "all", label: "全部来源" },
    { value: "panel", label: "分镜" },
    { value: "character", label: "角色" },
    { value: "pose", label: "姿态" },
    { value: "scene", label: "场景" },
    { value: "other", label: "其他" },
  ];

  const fetchImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
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
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchImages();
  };

  const buildSourceLink = (img: GeneratedImage) => {
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
    <div className="min-h-screen bg-[#09090b]">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="font-bold text-3xl text-white">生成图库</h1>
              <p className="text-zinc-400">按时间回溯所有生成图片，支持按关键词与风格筛选</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchImages} disabled={loading} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600">
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border border-zinc-800 rounded-lg bg-zinc-900/50 mb-8">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="flex items-end">
              <Button className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white border-0" onClick={handleSearch} disabled={loading}>
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
            <div className="border border-dashed border-zinc-800 rounded-lg p-10 text-center text-zinc-400">
              暂无生成记录
            </div>
          )}

          {!loading && images.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                    <div className="aspect-[4/5] bg-zinc-950 flex items-center justify-center overflow-hidden">
                      {/* 使用原图，避免 Next Image 需额外配置 */}
                      <img
                        src={img.image_url}
                        alt={img.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {img.style || "未标注风格"}
                        </span>
                        {img.created_at && (
                          <span>{format(new Date(img.created_at), "MM-dd HH:mm", { locale: zhCN })}</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 inline-flex items-center gap-2 flex-wrap">
                        {img.source_type ? (
                          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 capitalize">
                            {img.source_type}
                          </span>
                        ) : null}
                        {img.source_id ? <span className="text-zinc-600">ID: {img.source_id}</span> : null}
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
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLastPage || loading}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
