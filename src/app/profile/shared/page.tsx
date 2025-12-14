"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Eye, ExternalLink, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { UserSharedItem } from "@/lib/gallery-types";

interface SharedListResponse {
  items: UserSharedItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ProfileSharedPage(): JSX.Element {
  const [data, setData] = useState<SharedListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [unsharing, setUnsharing] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadShared = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/profile/shared?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error("Failed to load shared items");
      }
      const result = (await response.json()) as SharedListResponse;
      setData(result);
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShared();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleUnshare = async (panelId: string): Promise<void> => {
    setUnsharing(panelId);
    try {
      const response = await fetch(`/api/panel/${panelId}/share`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "取消分享失败");
      }

      toast({
        title: "取消分享成功",
        description: "作品已从画廊移除",
      });

      // 重新加载列表
      await loadShared();
    } catch (error) {
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setUnsharing(null);
      setDeleteDialogOpen(false);
      setSelectedPanelId(null);
    }
  };

  const openDeleteDialog = (panelId: string): void => {
    setSelectedPanelId(panelId);
    setDeleteDialogOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回
      </Button>

      {/* 标题 */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">我的分享</h1>
        <p className="text-muted-foreground">
          管理你在画廊中分享的作品
        </p>
      </div>

      {/* 分享列表 */}
      {!data || data.items.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-12">
            <p className="mb-4 text-muted-foreground">还没有分享任何作品</p>
            <Link href="/scripts">
              <Button>前往创作</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* 图片 */}
                  <Link
                    href={`/gallery/${item.id}`}
                    target="_blank"
                    className="group relative block aspect-[3/4] overflow-hidden bg-muted"
                  >
                    {item.generated_image ? (
                      <Image
                        src={item.generated_image}
                        alt={item.description}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}

                    {/* Hover 覆盖层 */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <ExternalLink className="h-8 w-8 text-white" />
                    </div>
                  </Link>

                  {/* 信息栏 */}
                  <div className="p-3">
                    <h3 className="mb-1 line-clamp-1 font-semibold text-sm">
                      {item.project.title}
                    </h3>
                    <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>

                    {/* 统计和操作 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>{item.view_count} 浏览</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(item.id)}
                        disabled={unsharing === item.id}
                        className="h-7 px-2 text-xs"
                      >
                        {unsharing === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="mr-1 h-3 w-3" />
                            取消分享
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {data.totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}

          {/* 总数统计 */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            共 {data.total} 件分享作品
          </div>
        </>
      )}

      {/* 确认删除对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消分享？</AlertDialogTitle>
            <AlertDialogDescription>
              取消分享后，作品将从公开画廊移除，其他用户将无法再浏览此作品。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedPanelId) {
                  handleUnshare(selectedPanelId);
                }
              }}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
