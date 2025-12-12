import { useState } from "react";
import { VersionFilters } from "../types";

export const usePagination = (
  initialPage = 1,
  initialPageSize = 20,
  onFetch: (page: number, pageSize: number, filters: VersionFilters) => void
) => {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<VersionFilters>({ projectId: "", taskId: "" });
  const [filterInputs, setFilterInputs] = useState(filters);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

  const handleFilterInputChange = (field: keyof VersionFilters, value: string) => {
    setFilterInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setFilters(filterInputs);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterInputs({ projectId: "", taskId: "" });
    setFilters({ projectId: "", taskId: "" });
    setPage(1);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage((prev) => (prev < totalPages ? prev + 1 : prev));
  };

  const handlePageSizeChange = (value: string) => {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return;
    setPageSize(size);
    setPage(1);
  };

  const handleRefresh = () => {
    onFetch(page, pageSize, filters);
  };

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    setTotal,
    totalPages,
    filters,
    setFilters,
    filterInputs,
    handleFilterInputChange,
    handleApplyFilters,
    handleResetFilters,
    handlePrevPage,
    handleNextPage,
    handlePageSizeChange,
    handleRefresh,
  };
};
