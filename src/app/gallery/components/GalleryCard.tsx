"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, User, Sparkles } from "lucide-react";
import type { GalleryItem } from "@/lib/gallery-types";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

interface GalleryCardProps {
  item: GalleryItem;
}

export function GalleryCard({ item }: GalleryCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={`/gallery/${item.id}`} className="block">
      <GlassCard 
        className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 border-zinc-800 bg-zinc-900/20"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        variant="default"
      >
        {/* 图片区域 */}
        <div className="relative w-full bg-zinc-900 overflow-hidden">
           {/* 根据图片尺寸自适应高度，这里依然使用Image组件但允许其自然撑开容器（Masonry布局特性）
               由于next/image需要固定宽高或fill，在Masonry中通常配合 aspect-ratio 或 fill + 父容器高度控制。
               为了简单起见，这里假设图片是竖向的，给一个基础比例，实际高度由Masonry控制。
           */}
           <div className="relative aspect-[3/4]"> 
            {item.generated_image ? (
                <Image
                src={item.generated_image}
                alt={item.description || "Generated Image"}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
            ) : (
                <div className="flex h-full items-center justify-center text-zinc-700">
                <Sparkles className="h-10 w-10 opacity-20" />
                </div>
            )}
           </div>

          {/* 渐变遮罩 - 常驻底部渐变以保证文字可读性 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
          
          {/* 顶部标签 */}
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-2 group-hover:translate-y-0">
            {item.comic_style && (
                <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 border border-white/10">
                {item.comic_style.name_zh}
                </span>
            )}
          </div>

          {/* 底部信息 - 悬停时上浮显示完整 Prompt */}
          <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-300">
            {/* 标题与作者 */}
            <div className={cn(
                "transition-all duration-300",
                isHovered ? "opacity-0 translate-y-4 h-0" : "opacity-100 translate-y-0"
            )}>
                <h3 className="line-clamp-1 font-bold text-white mb-1">{item.project.title}</h3>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden ring-1 ring-white/10">
                            {item.author.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.author.image} alt={item.author.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-3 w-3 text-zinc-500" />
                            )}
                        </div>
                        <span className="line-clamp-1">{item.author.name || "匿名"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-500">
                        <Eye className="h-3 w-3" />
                        <span>{item.view_count}</span>
                    </div>
                </div>
            </div>

            {/* Prompt 展示 (Hover 时显示) */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 transition-all duration-300 flex flex-col gap-2",
                isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
            )}>
                 <p className="text-xs text-zinc-300 line-clamp-4 leading-relaxed">
                    <span className="text-orange-500 font-bold mr-1">Prompt:</span>
                    {item.description || "无描述"}
                </p>
                {item.dialogue && (
                    <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-2">
                    &quot;{item.dialogue}&quot;
                    </p>
                )}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/5">
                    <span className="text-[10px] text-zinc-500">Created by {item.author.name}</span>
                    <span className="text-[10px] text-orange-400 font-medium cursor-pointer hover:underline">查看详情 →</span>
                </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
