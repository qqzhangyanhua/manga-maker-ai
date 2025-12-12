"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Search, Filter, X, Plus, Info } from "lucide-react";
import { PanelTemplate, SuccessResponse } from "@/types/template";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedTemplate, setSelectedTemplate] = useState<PanelTemplate | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [page, setPage] = useState(1);

  // Build query params
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "20");
    params.set("type", activeTab);

    if (searchQuery) {
      params.set("search", searchQuery);
    }
    if (selectedTags.length > 0) {
      params.set("tags", selectedTags.join(","));
    }
    if (panelCountRange && panelCountRange !== "all") {
      params.set("panelCount", panelCountRange);
    }

    return params.toString();
  };

  // Fetch templates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["templates", activeTab, page, searchQuery, selectedTags, panelCountRange],
    queryFn: async () => {
      const response = await fetch(`/api/templates?${buildQueryParams()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      const json: SuccessResponse<{
        templates: Array<PanelTemplate & { user?: { id: string; name: string | null; image: string | null } }>;
        likedTemplateIds: string[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }> = await response.json();
      return json.data;
    }
  });

  // Get liked template IDs from API response
  const likedTemplateIds = data?.likedTemplateIds ? new Set(data.likedTemplateIds) : new Set<string>();

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
  };

  const hasFilters = searchQuery || selectedTags.length > 0 || (panelCountRange !== "all");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">模板市场</h1>
        </div>
        <p className="text-muted-foreground">
          探索和应用各种分镜模板，快速创建专业的漫画故事板
        </p>
      </div>

      {/* Info alert for creating templates */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          想创建自己的模板？在故事板编辑器中选择分镜，点击"另存为模板"即可将您的创作保存为可复用的模板。
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as "official" | "community" | "my");
        setPage(1);
      }}>
        <TabsList>
          <TabsTrigger value="official">官方模板</TabsTrigger>
          <TabsTrigger value="community">社区模板</TabsTrigger>
          <TabsTrigger value="my">我的模板</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="mt-6 space-y-4">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索模板名称或描述..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={panelCountRange} onValueChange={(value) => {
              setPanelCountRange(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="分镜数量" />
              </SelectTrigger>
              <SelectContent>
                {PANEL_COUNT_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-1" />
                清除筛选
              </Button>
            )}
          </div>

          {/* Tag filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground flex items-center">
              <Filter className="h-4 w-4 mr-1" />
              标签筛选:
            </span>
            {COMMON_TAGS.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleToggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Template grid */}
        <TabsContent value="official" className="mt-6">
          <TemplateGrid
            templates={data?.templates || []}
            isLoading={isLoading}
            likedTemplateIds={likedTemplateIds}
            onLike={handleLike}
            onApply={handleApplyClick}
            emptyMessage="暂无官方模板"
          />
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <TemplateGrid
            templates={data?.templates || []}
            isLoading={isLoading}
            likedTemplateIds={likedTemplateIds}
            onLike={handleLike}
            onApply={handleApplyClick}
            emptyMessage="暂无社区模板"
          />
        </TabsContent>

        <TabsContent value="my" className="mt-6">
          <TemplateGrid
            templates={data?.templates || []}
            isLoading={isLoading}
            likedTemplateIds={likedTemplateIds}
            onLike={handleLike}
            onApply={handleApplyClick}
            emptyMessage="您还没有创建任何模板"
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
          >
            上一页
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            第 {data.pagination.page} / {data.pagination.totalPages} 页
          </span>
          <Button
            variant="outline"
            disabled={page === data.pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
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
  );
}
