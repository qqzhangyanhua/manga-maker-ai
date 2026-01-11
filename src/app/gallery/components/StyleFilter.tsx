"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComicStyle {
  id: string;
  name_zh: string;
  name_en: string;
  style_key: string;
  image_url: string;
}

interface StyleFilterProps {
  selectedStyleId: string | null;
  onStyleChange: (styleId: string | null) => void;
}

export function StyleFilter({
  selectedStyleId,
  onStyleChange,
}: StyleFilterProps): JSX.Element {
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/comic-styles")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch styles");
        }
        return res.json();
      })
      .then((response: { data?: ComicStyle[]; total?: number }) => {
        setStyles(response.data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch comic styles:", error);
        setStyles([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1 overflow-hidden">
        <div className="h-8 w-16 bg-zinc-800 rounded-full animate-pulse" />
        <div className="h-8 w-24 bg-zinc-800 rounded-full animate-pulse" />
        <div className="h-8 w-20 bg-zinc-800 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
      <Button
        variant={selectedStyleId === null ? "default" : "outline"}
        size="sm"
        onClick={() => onStyleChange(null)}
        className={cn(
          "rounded-full transition-all border-zinc-700/50 shrink-0",
          !selectedStyleId 
            ? "bg-orange-500 hover:bg-orange-600 text-white border-transparent shadow-lg shadow-orange-500/20" 
            : "text-zinc-400 hover:text-white hover:bg-zinc-800 bg-zinc-900/40"
        )}
      >
        全部
      </Button>

      {styles.map((style) => (
        <Button
          key={style.id}
          variant={selectedStyleId === style.id ? "default" : "outline"}
          size="sm"
          onClick={() => onStyleChange(style.id)}
          className={cn(
            "rounded-full transition-all border-zinc-700/50 shrink-0 flex items-center gap-2",
            selectedStyleId === style.id
              ? "bg-orange-500 hover:bg-orange-600 text-white border-transparent shadow-lg shadow-orange-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800 bg-zinc-900/40"
          )}
        >
          {style.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={style.image_url} 
              alt="" 
              className="w-4 h-4 rounded-full object-cover ring-1 ring-white/20" 
            />
          )}
          {style.name_zh}
        </Button>
      ))}
    </div>
  );
}
