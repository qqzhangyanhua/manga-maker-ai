"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  ArrowLeft,
  Eye,
  User,
  Palette,
  Camera,
  Maximize,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GalleryDetail } from "@/lib/gallery-types";

export default function GalleryDetailPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [detail, setDetail] = useState<GalleryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/gallery/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("作品不存在或未分享");
        }
        return res.json();
      })
      .then((data: GalleryDetail) => {
        setDetail(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <p className="mb-4 text-muted-foreground">{error || "作品不存在"}</p>
          <Button onClick={() => router.push("/gallery")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回画廊
          </Button>
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
        onClick={() => router.push("/gallery")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        返回画廊
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 左侧：图片 */}
        <div>
          <Card>
            <CardContent className="p-4">
              {detail.generated_image ? (
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={detail.generated_image}
                    alt={detail.description}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-muted">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              {/* 统计信息 */}
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{detail.view_count} 次浏览</span>
                </div>
                {detail.comic_style && (
                  <Badge variant="secondary">{detail.comic_style.name_zh}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：详情 */}
        <div className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>作品信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 项目标题 */}
              <div>
                <h2 className="text-2xl font-bold">{detail.project.title}</h2>
                <p className="text-sm text-muted-foreground">
                  第 {detail.panel_order} 格
                </p>
              </div>

              {/* 描述 */}
              {detail.description && (
                <div>
                  <h3 className="mb-2 font-semibold text-sm">描述</h3>
                  <p className="text-sm">{detail.description}</p>
                </div>
              )}

              {/* 对话 */}
              {detail.dialogue && (
                <div>
                  <h3 className="mb-2 font-semibold text-sm">对话</h3>
                  <p className="italic text-sm text-muted-foreground">
                    &quot;{detail.dialogue}&quot;
                  </p>
                </div>
              )}

              {/* 作者 */}
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-sm">作者</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.author.name || "匿名用户"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt 信息 */}
          {detail.show_prompt && (detail.prompt_used || detail.visual_prompt) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  生成提示词
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.visual_prompt && (
                  <div>
                    <h4 className="mb-1 font-semibold text-sm">视觉描述</h4>
                    <p className="text-sm text-muted-foreground">
                      {detail.visual_prompt}
                    </p>
                  </div>
                )}
                {detail.prompt_used && (
                  <div>
                    <h4 className="mb-1 font-semibold text-sm">完整 Prompt</h4>
                    <p className="rounded-md bg-muted p-3 font-mono text-xs">
                      {detail.prompt_used}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 技术参数 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                拍摄参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-sm">镜头类型</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.panel_type || "未指定"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-sm">重要性</p>
                  <p className="text-sm text-muted-foreground">
                    {detail.importance || "未指定"}
                  </p>
                </div>
                {detail.camera_angle && (
                  <div>
                    <p className="font-semibold text-sm">镜头角度</p>
                    <p className="text-sm text-muted-foreground">
                      {detail.camera_angle}
                    </p>
                  </div>
                )}
                {detail.shot_size && (
                  <div>
                    <p className="font-semibold text-sm">景别</p>
                    <p className="text-sm text-muted-foreground">
                      {detail.shot_size}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 关联资产 */}
          {(detail.character || detail.scene) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Maximize className="h-5 w-5" />
                  关联资产
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.character && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-1 font-semibold text-sm">角色</p>
                    <p className="text-sm">{detail.character.name}</p>
                    {detail.expression_type && (
                      <p className="text-xs text-muted-foreground">
                        表情: {detail.expression_type}
                      </p>
                    )}
                    {detail.outfit && (
                      <p className="text-xs text-muted-foreground">
                        服装: {detail.outfit.outfit_name}
                      </p>
                    )}
                  </div>
                )}
                {detail.scene && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-1 font-semibold text-sm">场景</p>
                    <p className="text-sm">{detail.scene.name}</p>
                    <p className="text-xs text-muted-foreground">
                      类型: {detail.scene.scene_type}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 查看项目 */}
          <Link
            href={`/projects/${detail.project_id}`}
          >
            <Button variant="outline" className="w-full">
              查看完整项目
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
