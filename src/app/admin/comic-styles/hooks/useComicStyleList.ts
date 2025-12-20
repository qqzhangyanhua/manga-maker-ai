import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ComicStyle } from "../types";

const COMIC_STYLES_QUERY_KEY = ["admin-comic-styles"];

export const useComicStyleList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch comic styles using React Query
  const {
    data: styles = [],
    isLoading: loading,
    refetch: fetchStyles,
  } = useQuery({
    queryKey: COMIC_STYLES_QUERY_KEY,
    queryFn: async (): Promise<ComicStyle[]> => {
      const res = await fetch("/api/admin/comic-styles", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "获取失败" }));
        throw new Error(data.message || "获取失败");
      }
      const data = await res.json();
      return (data.data || []) as ComicStyle[];
    },
    staleTime: 30 * 1000, // 30 seconds cache
    retry: 1,
  });

  // Toggle enabled mutation
  const toggleEnabledMutation = useMutation({
    mutationFn: async (style: ComicStyle) => {
      const res = await fetch(`/api/admin/comic-styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !style.enabled }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "切换失败" }));
        throw new Error(data.message || "切换失败");
      }

      return res.json();
    },
    onSuccess: (_, style) => {
      toast({ title: style.enabled ? "已禁用" : "已启用" });
      queryClient.invalidateQueries({ queryKey: COMIC_STYLES_QUERY_KEY });
    },
    onError: () => {
      toast({ title: "操作失败", variant: "destructive" });
    },
  });

  // Sort change mutation
  const sortChangeMutation = useMutation({
    mutationFn: async ({
      style,
      direction,
    }: {
      style: ComicStyle;
      direction: "up" | "down";
    }) => {
      const newOrder = direction === "up" ? style.sort_order - 1 : style.sort_order + 1;

      const res = await fetch(`/api/admin/comic-styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newOrder }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "调整失败" }));
        throw new Error(data.message || "调整失败");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMIC_STYLES_QUERY_KEY });
    },
    onError: () => {
      toast({ title: "调整失败", variant: "destructive" });
    },
  });

  const handleToggleEnabled = (style: ComicStyle) => {
    toggleEnabledMutation.mutate(style);
  };

  const handleSortChange = (style: ComicStyle, direction: "up" | "down") => {
    sortChangeMutation.mutate({ style, direction });
  };

  return {
    styles,
    loading,
    fetchStyles,
    handleToggleEnabled,
    handleSortChange,
  };
};
