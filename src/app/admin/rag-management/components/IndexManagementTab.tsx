"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, MoreVertical, RefreshCw, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChapterIndexRecord, IndexStatus } from "../types";

const IndexManagementTab: React.FC = () => {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<ChapterIndexRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (projectFilter !== "all") params.append("project_id", projectFilter);

      const response = await fetch(`/api/novel/rag/chapters?${params}`);
      if (!response.ok) throw new Error("Failed to fetch chapters");

      const data = await response.json();
      setChapters(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "获取章节列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [currentPage, searchQuery, statusFilter, projectFilter]);

  const handleRebuildSingle = async (chapterId: string) => {
    try {
      setActionLoading(chapterId);
      const response = await fetch("/api/novel/rag/rebuild-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: [chapterId], force: true }),
      });

      if (!response.ok) throw new Error("Rebuild failed");

      toast({
        title: "重建成功",
        description: "章节索引已重建",
      });
      fetchChapters();
    } catch (error) {
      toast({
        title: "重建失败",
        description: error instanceof Error ? error.message : "重建索引失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSingle = async (chapterId: string) => {
    try {
      setActionLoading(chapterId);
      const response = await fetch(`/api/novel/rag/chapter/${chapterId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      toast({
        title: "删除成功",
        description: "章节索引已删除",
      });
      fetchChapters();
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除索引失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: IndexStatus) => {
    switch (status) {
      case IndexStatus.INDEXED:
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">已索引</Badge>
        );
      case IndexStatus.NEED_REBUILD:
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">需重建</Badge>
        );
      case IndexStatus.NOT_INDEXED:
        return (
          <Badge variant="destructive">未索引</Badge>
        );
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索章节标题..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 border-2 border-zinc-900 dark:border-zinc-600"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="border-2 border-zinc-900 dark:border-zinc-600">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value={IndexStatus.INDEXED}>已索引</SelectItem>
                <SelectItem value={IndexStatus.NEED_REBUILD}>需重建</SelectItem>
                <SelectItem value={IndexStatus.NOT_INDEXED}>未索引</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={projectFilter}
              onValueChange={(value) => {
                setProjectFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="border-2 border-zinc-900 dark:border-zinc-600">
                <SelectValue placeholder="项目筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部项目</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => fetchChapters()}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black dark:border-zinc-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>章节索引列表</span>
            <span className="text-sm font-normal text-muted-foreground">
              共 {totalItems} 条记录
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">正在加载...</p>
          ) : chapters.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">暂无数据</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名</TableHead>
                  <TableHead>章节号</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>字数</TableHead>
                  <TableHead>索引时间</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chapters.map((chapter) => (
                  <TableRow key={chapter.chapterId}>
                    <TableCell className="font-medium">{chapter.projectName}</TableCell>
                    <TableCell>第 {chapter.chapterNumber} 章</TableCell>
                    <TableCell className="max-w-xs truncate">{chapter.title}</TableCell>
                    <TableCell>{chapter.wordCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {chapter.indexedAt
                        ? new Date(chapter.indexedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(chapter.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(chapter.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actionLoading === chapter.chapterId}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRebuildSingle(chapter.chapterId)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            重建索引
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteSingle(chapter.chapterId)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除索引
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                显示第 {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} 条，共 {totalItems} 条
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-2 border-zinc-900 dark:border-zinc-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  第 {currentPage} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="border-2 border-zinc-900 dark:border-zinc-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IndexManagementTab;
