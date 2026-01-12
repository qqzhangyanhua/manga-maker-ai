"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Navbar } from "@/components/Landing";
import { TemplateGrid } from "@/components/Template/TemplateGrid";
import { ApplyTemplateWithProjectDialog, ApplyTemplateData } from "@/components/Template/ApplyTemplateWithProjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Filter, X, Plus, Info, Users, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { TemplateWithMeta, SuccessResponse, TemplateCategory } from "@/types/template";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const COMMON_TAGS = [
  "对话", "战斗", "情感", "动作", "悬疑",
  "转场", "特写", "环境", "回忆", "蒙太奇"
];

const PANEL_COUNT_RANGES = [
  { label: "全部", value: "all" },
  { label: "1-3 分镜", value: "1-3" },
  { label: "4-6 分镜", value: "4-6" },
  { label: "7-12 分镜", value: "7-12" }
];

export default function TemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [panelCountRange, setPanelCountRange] = useState("all");
  const [activeTab, setActiveTab] = useState<"official" | "community" | "my">("official");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithMeta | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [difficulty, setDifficulty] = useState<"all" | "newbie" | "pro">("all");
  const [targetCharacters, setTargetCharacters] = useState<number | null>(null);

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

  // UI State
  const [isAlertVisible, setIsAlertVisible] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load alert state
  useEffect(() => {
    const hidden = localStorage.getItem("hide-template-alert");
    if (hidden) setIsAlertVisible(false);
  }, []);

  const handleDismissAlert = () => {
    setIsAlertVisible(false);
    localStorage.setItem("hide-template-alert", "true");
  };

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "20");
    params.set("type", activeTab);

    if (searchQuery) params.set("search", searchQuery);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (panelCountRange && panelCountRange !== "all") params.set("panelCount", panelCountRange);
    if (category !== "all") params.set("category", category);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    // Passing targetCharacters to API for future support, 
    // even if currently handled on client or partially server side
    if (targetCharacters) params.set("targetCharacters", targetCharacters.toString());

    return params.toString();
  };

  // Fetch templates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["templates", activeTab, page, searchQuery, selectedTags, panelCountRange, category, difficulty, targetCharacters],
    queryFn: async () => {
      const response = await fetch(`/api/templates?${buildQueryParams()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const json: SuccessResponse<{
        templates: Array<TemplateWithMeta & { user?: { id: string; name: string | null; image: string | null } }>;
        likedTemplateIds: string[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }> = await response.json();
      return json.data;
    }
  });

  // Get liked template IDs from API response
  const likedTemplateIds = data?.likedTemplateIds ? new Set(data.likedTemplateIds) : new Set<string>();

  // Client-side filtering for targetCharacters (since backend JSON range filter is complex/pending)
  // Logic: Only filter if data is loaded. Use server results directly for other filters.
  const filteredTemplates = (data?.templates || []).filter((t) => {
    // Only filter by characters on client for now as fallback
    if (targetCharacters && t.template_data?.meta?.recommendedCharacters) {
      const { min, max } = t.template_data.meta.recommendedCharacters;
      // Loose matching: if target is within [min, max]
      // Most templates might just have 'min' or 'max' or both.
      const minVal = min ?? 1;
      const maxVal = max ?? 100;
      if (targetCharacters < minVal || targetCharacters > maxVal) return false;
    }
    return true;
  });

  // Like/unlike template mutation
  const likeMutation = useMutation({
    mutationFn: async ({ templateId, isLiked }: { templateId: string; isLiked: boolean }) => {
      const response = await fetch(`/api/templates/${templateId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        throw new Error("Failed to like template");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: () => {
      toast({
        title: "操作失败",
        description: "点赞操作失败，请重试",
        variant: "destructive"
      });
    }
  });

  // Apply template mutation
  const applyMutation = useMutation({
    mutationFn: async (data: ApplyTemplateData) => {
      const response = await fetch(`/api/templates/${data.templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply template");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "应用成功",
        description: `成功应用模板「${data.data.template.name}」`
      });
      setShowApplyDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "应用失败",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handlers
  const handleLike = (templateId: string, isLiked: boolean) => {
    likeMutation.mutate({ templateId, isLiked });
  };

  const handleApplyClick = (templateId: string) => {
    const template = data?.templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setShowApplyDialog(true);
    }
  };

  const handleApplyTemplate = async (data: ApplyTemplateData) => {
    await applyMutation.mutateAsync(data);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setPanelCountRange("all");
    setPage(1);
    setCategory("all");
    setDifficulty("all");
    setTargetCharacters(null);
  };

  const hasFilters =
    searchQuery ||
    selectedTags.length > 0 ||
    panelCountRange !== "all" ||
    category !== "all" ||
    difficulty !== "all" ||
    targetCharacters !== null;

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

          <div className="max-w-7xl mx-auto relative space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-500 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Link>

            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent">
                模板市场
              </h1>
              <p className="text-zinc-300 text-lg">
                探索和应用各种分镜模板，快速创建专业的漫画故事板
              </p>
            </div>

            {/* Info alert for creating templates */}
            {isAlertVisible && (
              <Alert className="border-zinc-700 bg-zinc-900/60 backdrop-blur-md relative pr-10">
                <Info className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-zinc-300">
                  想创建自己的模板？在故事板编辑器中选择分镜，点击"另存为模板"即可将您的创作保存为可复用的模板。
                </AlertDescription>
                <button
                  onClick={handleDismissAlert}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as "official" | "community" | "my");
              setPage(1);
            }}>
              <TabsList className="bg-zinc-900/60 backdrop-blur-md border border-zinc-700">
                <TabsTrigger value="official" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">官方模板</TabsTrigger>
                <TabsTrigger value="community" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">社区模板</TabsTrigger>
                <TabsTrigger value="my" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">我的模板</TabsTrigger>
              </TabsList>

              {/* Filters */}
              <div className="mt-6 space-y-4">
                {/* Search bar & Primary Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder="搜索模板名称或描述..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
                    />
                  </div>

                  {/* Common Filters visible on mobile/desktop */}
                  <Select value={panelCountRange} onValueChange={(value) => {
                    setPanelCountRange(value);
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-full md:w-[150px] bg-zinc-900 border-zinc-700 text-white h-10">
                      <SelectValue placeholder="分镜数量" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {PANEL_COUNT_RANGES.map(range => (
                        <SelectItem key={range.value} value={range.value} className="text-white focus:bg-zinc-800 focus:text-white">
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={cn(
                      "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white w-full md:w-auto h-10",
                      showAdvancedFilters && "bg-zinc-800 text-white border-orange-500/50"
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {showAdvancedFilters ? "收起筛选" : "高级筛选"}
                  </Button>

                  {hasFilters && (
                    <Button variant="ghost" onClick={handleClearFilters} className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-10 px-3">
                      <X className="h-4 w-4 mr-1" />
                      清除
                    </Button>
                  )}
                </div>

                {/* Advanced Filters (Collapsible) */}
                {showAdvancedFilters && (
                  <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/60 space-y-4 animate-in fade-in slide-in-from-top-1">
                    <div className="flex flex-wrap gap-4 items-center">
                      {/* Classification */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 font-medium">类型</label>
                        <Select
                          value={category}
                          onValueChange={(value) => {
                            setCategory(value as TemplateCategory | "all");
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700 text-white h-9">
                            <SelectValue placeholder="全部类型" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            <SelectItem value="all" className="text-white focus:bg-zinc-800 focus:text-white">全部类型</SelectItem>
                            <SelectItem value="short" className="text-white focus:bg-zinc-800 focus:text-white">短篇</SelectItem>
                            <SelectItem value="strip" className="text-white focus:bg-zinc-800 focus:text-white">条漫</SelectItem>
                            <SelectItem value="four" className="text-white focus:bg-zinc-800 focus:text-white">四格</SelectItem>
                            <SelectItem value="comic" className="text-white focus:bg-zinc-800 focus:text-white">分幕</SelectItem>
                            <SelectItem value="blank" className="text-white focus:bg-zinc-800 focus:text-white">空白</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Difficulty */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 font-medium">难度</label>
                        <Select
                          value={difficulty}
                          onValueChange={(value) => {
                            setDifficulty(value as "all" | "newbie" | "pro");
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700 text-white h-9">
                            <SelectValue placeholder="全部难度" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            <SelectItem value="all" className="text-white focus:bg-zinc-800 focus:text-white">全部难度</SelectItem>
                            <SelectItem value="newbie" className="text-white focus:bg-zinc-800 focus:text-white">新手友好</SelectItem>
                            <SelectItem value="pro" className="text-white focus:bg-zinc-800 focus:text-white">进阶</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Character Count */}
                      <div className="space-y-1.5 min-w-[200px]">
                        <div className="flex justify-between">
                          <label className="text-xs text-zinc-500 font-medium">角色数量</label>
                          <span className="text-xs text-orange-400 font-mono">
                            {targetCharacters ? `~${targetCharacters} 人` : "任意"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Slider
                            min={1}
                            max={6}
                            step={1}
                            value={[targetCharacters ?? 0]}
                            onValueChange={([value]) => setTargetCharacters(value === 0 ? null : value)}
                            className="flex-1"
                          />
                          {targetCharacters !== null && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-500 hover:text-white" onClick={() => setTargetCharacters(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        标签
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_TAGS.map(tag => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-all",
                              selectedTags.includes(tag)
                                ? "bg-orange-500 text-white hover:bg-orange-600 border-orange-500"
                                : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                            onClick={() => handleToggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Template grid */}
              <TabsContent value="official" className="mt-6">
                <TemplateGrid
                  templates={filteredTemplates}
                  isLoading={isLoading}
                  likedTemplateIds={likedTemplateIds}
                  onLike={handleLike}
                  onApply={handleApplyClick}
                  emptyMessage="暂无官方模板"
                  targetCharacters={targetCharacters}
                  onClearFilters={handleClearFilters}
                />
              </TabsContent>

              <TabsContent value="community" className="mt-6">
                <TemplateGrid
                  templates={filteredTemplates}
                  isLoading={isLoading}
                  likedTemplateIds={likedTemplateIds}
                  onLike={handleLike}
                  onApply={handleApplyClick}
                  emptyMessage="暂无社区模板"
                  targetCharacters={targetCharacters}
                  onClearFilters={handleClearFilters}
                />
              </TabsContent>

              <TabsContent value="my" className="mt-6">
                <TemplateGrid
                  templates={filteredTemplates}
                  isLoading={isLoading}
                  likedTemplateIds={likedTemplateIds}
                  onLike={handleLike}
                  onApply={handleApplyClick}
                  emptyMessage="您还没有创建任何模板"
                  targetCharacters={targetCharacters}
                  onClearFilters={handleClearFilters}
                />
              </TabsContent>
            </Tabs>


            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                >
                  上一页
                </Button>
                <span className="flex items-center px-4 text-sm text-zinc-400">
                  第 {data.pagination.page} / {data.pagination.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  disabled={page === data.pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-orange-500/50"
                >
                  下一页
                </Button>
              </div>
            )}

            {/* Apply template dialog */}
            <ApplyTemplateWithProjectDialog
              open={showApplyDialog}
              onOpenChange={setShowApplyDialog}
              template={selectedTemplate}
              onApply={handleApplyTemplate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
