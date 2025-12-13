"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Image as ImageIcon, Loader2, RefreshCw, Search, ArrowLeft, Filter, ArrowUpRight } from "lucide-react";
import Header from "@/components/Header";
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="font-comic text-3xl text-foreground">生成图库</h1>
              <p className="text-muted-foreground">按时间回溯所有生成图片，支持按关键词与风格筛选</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchImages} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border border-border rounded-lg bg-card mb-8">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Search className="w-4 h-4" />
                提示词关键词
              </div>
              <Input
                placeholder="在 prompt 中搜索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="w-4 h-4" />
                风格
              </div>
              <Input
                placeholder="如 manga / webtoon / realistic"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="w-4 h-4" />
                来源
              </div>
              <Select value={sourceType} onValueChange={(val) => setSourceType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="全部来源" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full md:w-auto" onClick={handleSearch} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                查询
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              加载中...
            </div>
          )}

          {!loading && images.length === 0 && (
            <div className="border border-dashed border-border rounded-lg p-10 text-center text-muted-foreground">
              暂无生成记录
            </div>
          )}

          {!loading && images.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="border border-border rounded-lg overflow-hidden bg-card">
                    <div className="aspect-[4/5] bg-muted flex items-center justify-center overflow-hidden">
                      {/* 使用原图，避免 Next Image 需额外配置 */}
                      <img
                        src={img.image_url}
                        alt={img.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {img.style || "未标注风格"}
                        </span>
                        {img.created_at && (
                          <span>{format(new Date(img.created_at), "MM-dd HH:mm", { locale: zhCN })}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-2 flex-wrap">
                        {img.source_type ? (
                          <span className="px-2 py-1 rounded-md bg-muted text-foreground capitalize">
                            {img.source_type}
                          </span>
                        ) : null}
                        {img.source_id ? <span className="text-muted-foreground/80">ID: {img.source_id}</span> : null}
                        {buildSourceLink(img) && (
                          <Link
                            href={buildSourceLink(img)!}
                            className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                          >
                            跳转
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-3">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>

              {pagination && (
                <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
                  <div>
                    第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isFirstPage || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLastPage || loading}
                      onClick={() => setPage((p) => p + 1)}
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
