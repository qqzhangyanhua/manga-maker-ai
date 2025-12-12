import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Character, UserMeta, Filters } from "../types";

export const useCharacterList = (filters: Filters, page: number, pageSize: number) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserMeta>>({});
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const { toast } = useToast();

  const fetchCharacters = useCallback(
    async (targetPage = currentPage, targetPageSize = currentPageSize) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
        if (filters.userId.trim()) params.set("userId", filters.userId.trim());
        if (filters.status !== "all") params.set("status", filters.status);
        params.set("limit", String(targetPageSize));
        params.set("page", String(targetPage));

        const res = await fetch(`/api/admin/characters?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "获取角色列表失败");
        }
        setCharacters(data.data.characters as Character[]);
        setUserMap(data.data.userMap || {});
        setTotal(data.data.total || 0);
        setCurrentPage(data.data.page || targetPage);
        setCurrentPageSize(data.data.pageSize || targetPageSize);
      } catch (error) {
        toast({
          title: "获取失败",
          description: error instanceof Error ? error.message : "请稍后重试",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [filters, currentPage, currentPageSize, toast]
  );

  return {
    characters,
    userMap,
    loading,
    total,
    currentPage,
    currentPageSize,
    fetchCharacters,
    setCurrentPage,
    setCurrentPageSize,
  };
};
