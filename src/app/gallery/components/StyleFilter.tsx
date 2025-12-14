"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ComicStyle {
  id: string;
  name_zh: string;
  name_en: string;
  style_key: string;
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
      .then((res) => res.json())
      .then((data: ComicStyle[]) => {
        setStyles(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch comic styles:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* 全部 */}
      <Button
        variant={selectedStyleId === null ? "default" : "outline"}
        size="sm"
        onClick={() => onStyleChange(null)}
      >
        全部
      </Button>

      {/* 风格按钮 */}
      {styles.map((style) => (
        <Button
          key={style.id}
          variant={selectedStyleId === style.id ? "default" : "outline"}
          size="sm"
          onClick={() => onStyleChange(style.id)}
        >
          {style.name_zh}
        </Button>
      ))}
    </div>
  );
}
