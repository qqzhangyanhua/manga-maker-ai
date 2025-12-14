"use client";

import Masonry from "react-masonry-css";
import { GalleryCard } from "./GalleryCard";
import type { GalleryItem } from "@/lib/gallery-types";
import "./GalleryGrid.css";

interface GalleryGridProps {
  items: GalleryItem[];
}

export function GalleryGrid({ items }: GalleryGridProps): JSX.Element {
  // 响应式断点配置
  const breakpointColumns = {
    default: 4, // 大屏幕 4 列
    1536: 4, // 2xl
    1280: 3, // xl
    1024: 3, // lg
    768: 2, // md
    640: 2, // sm
    475: 1, // xs
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">暂无作品</p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="masonry-grid"
      columnClassName="masonry-grid-column"
    >
      {items.map((item) => (
        <div key={item.id} className="mb-4">
          <GalleryCard item={item} />
        </div>
      ))}
    </Masonry>
  );
}
