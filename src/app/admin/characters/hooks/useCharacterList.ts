import { useAdminList } from "@/hooks/admin/use-admin-list";
import { Character, UserMeta, Filters } from "../types";

export const useCharacterList = (filters: Filters, page: number, pageSize: number) => {
  const {
    items: characters,
    loading,
    total,
    page: currentPage,
    pageSize: currentPageSize,
    refetch: fetchCharacters,
    setFilter,
    setPage,
    extra,
  } = useAdminList<Character, Filters>({
    endpoint: "/api/admin/characters",
    initialFilter: filters,
    initialPage: page,
    initialPageSize: pageSize,
    autoFetch: true,
    itemsKey: "characters",
  });

  // Extract userMap from extra data
  const userMap = (extra?.userMap as Record<string, UserMeta>) || {};

  return {
    characters,
    userMap,
    loading,
    total,
    currentPage,
    currentPageSize,
    fetchCharacters,
    setFilter,
    setPage,
  };
};
