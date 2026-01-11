"use client";

import Masonry from "react-masonry-css";
import { GalleryCard } from "./GalleryCard";
import type { GalleryItem } from "@/lib/gallery-types";
import "./GalleryGrid.css";
import { Sparkles } from "lucide-react";

interface GalleryGridProps {
  items: GalleryItem[];
}

export function GalleryGrid({ items }: GalleryGridProps): JSX.Element {
  // 响应式断点配置
  const breakpointColumns = {
    default: 5, // 超大屏幕 5 列
    1920: 4,
    1536: 4,
    1280: 3, 
    1024: 3, 
    768: 2, 
    640: 2, 
    475: 1, 
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-[400px] items-center justify-center text-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">暂无作品</h3>
        <p className="text-zinc-400 max-w-sm">
            该分类下还没有任何作品。快去创作并分享你的第一个杰作吧！
        </p>
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
        <div key={item.id} className="mb-6">
          <GalleryCard item={item} />
        </div>
      ))}
    </Masonry>
  );
}
