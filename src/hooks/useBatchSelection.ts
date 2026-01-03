import { useState, useCallback, useMemo } from "react";

export interface UseBatchSelectionOptions<T> {
  items: T[];
  getId: (item: T) => string;
}

export interface UseBatchSelectionReturn<T> {
  selectedIds: Set<string>;
  selectedCount: number;
  selectedItems: T[];
  selectAll: () => void;
  deselectAll: () => void;
  toggleItem: (id: string) => void;
  toggleRange: (startId: string, endId: string) => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

export function useBatchSelection<T>({
  items,
  getId,
}: UseBatchSelectionOptions<T>): UseBatchSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)));
  }, [items, getId]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleRange = useCallback(
    (startId: string, endId: string) => {
      const startIdx = items.findIndex((item) => getId(item) === startId);
      const endIdx = items.findIndex((item) => getId(item) === endId);

      if (startIdx === -1 || endIdx === -1) return;

      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

      const rangeIds = items.slice(from, to + 1).map(getId);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [items, getId]
  );

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(getId(item)));
  }, [items, selectedIds, getId]);

  const isAllSelected = useMemo(() => {
    return items.length > 0 && selectedIds.size === items.length;
  }, [items.length, selectedIds.size]);

  const isSomeSelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < items.length;
  }, [items.length, selectedIds.size]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    selectedItems,
    selectAll,
    deselectAll,
    toggleItem,
    toggleRange,
    isSelected,
    isAllSelected,
    isSomeSelected,
  };
}
