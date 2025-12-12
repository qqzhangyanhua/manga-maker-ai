import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ComicStyle } from "../types";

export const useComicStyleList = () => {
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStyles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/comic-styles");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setStyles(data.data || []);
    } catch (error) {
      toast({ title: "加载失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleToggleEnabled = async (style: ComicStyle) => {
    try {
      const res = await fetch(`/api/admin/comic-styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !style.enabled }),
      });

      if (!res.ok) throw new Error("切换失败");

      toast({ title: style.enabled ? "已禁用" : "已启用" });
      fetchStyles();
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleSortChange = async (style: ComicStyle, direction: "up" | "down") => {
    const newOrder = direction === "up" ? style.sort_order - 1 : style.sort_order + 1;

    try {
      const res = await fetch(`/api/admin/comic-styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newOrder }),
      });

      if (!res.ok) throw new Error("调整失败");

      fetchStyles();
    } catch (error) {
      toast({ title: "调整失败", variant: "destructive" });
    }
  };

  return {
    styles,
    loading,
    fetchStyles,
    handleToggleEnabled,
    handleSortChange,
  };
};
