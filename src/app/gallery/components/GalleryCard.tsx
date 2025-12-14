"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, User } from "lucide-react";
import type { GalleryItem } from "@/lib/gallery-types";

interface GalleryCardProps {
  item: GalleryItem;
}

export function GalleryCard({ item }: GalleryCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={`/gallery/${item.id}`}>
      <div
        className="group relative overflow-hidden rounded-lg bg-card shadow-sm transition-all hover:shadow-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 图片 */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {item.generated_image ? (
            <Image
              src={item.generated_image}
              alt={item.description}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}

          {/* Hover Overlay - 显示 Prompt */}
          {isHovered && item.show_prompt && item.description && (
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
              <div className="max-h-[60%] w-full overflow-y-auto">
                <p className="text-xs text-white/90 line-clamp-6">
                  <span className="font-semibold text-primary">Prompt:</span>{" "}
                  {item.description}
                </p>
                {item.dialogue && (
                  <p className="mt-2 text-xs italic text-white/75">
                    &quot;{item.dialogue}&quot;
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 风格标签 */}
          {item.comic_style && (
            <div className="absolute right-2 top-2">
              <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                {item.comic_style.name_zh}
              </span>
            </div>
          )}
        </div>

        {/* 信息栏 */}
        <div className="p-3">
          {/* 项目标题 */}
          <h3 className="mb-2 line-clamp-1 font-semibold text-sm">
            {item.project.title}
          </h3>

          {/* 作者和浏览量 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">
                {item.author.name || "匿名用户"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{item.view_count}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
