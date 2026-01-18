/**
 * 全局搜索框组件
 *
 * 功能:
 * - Cmd+K快捷键打开
 * - 实时搜索建议
 * - 搜索历史
 * - 保存的过滤器快速访问
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, History, Star, Filter, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchSuggestion {
  type: "history" | "popular" | "project" | "character";
  text: string;
  highlight: string;
  meta?: {
    project_id?: string;
    count?: number;
  };
}

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  is_pinned: boolean;
}

export function GlobalSearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Cmd+K 快捷键
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // 获取搜索建议
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery]);

  // 打开时加载保存的过滤器
  useEffect(() => {
    if (open) {
      fetchSavedFilters();
    }
  }, [open]);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/novel/search/suggest?query=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("获取搜索建议失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSavedFilters = useCallback(async () => {
    try {
      const res = await fetch("/api/novel/search/saved-filters");
      if (res.ok) {
        const data = await res.json();
        setSavedFilters(data.filters || []);
      }
    } catch (error) {
      console.error("获取保存的过滤器失败:", error);
    }
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // 关闭对话框
    setOpen(false);

    // 跳转到搜索结果页
    router.push(`/novel/search?q=${encodeURIComponent(searchQuery)}`);
  }, [router]);

  const handleApplyFilter = useCallback((filter: SavedFilter) => {
    setOpen(false);
    router.push(`/novel/search?filter_id=${filter.id}`);
  }, [router]);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "history":
        return <History className="h-4 w-4" />;
      case "project":
        return <Search className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400
                   bg-zinc-900/50 border border-zinc-800 rounded-md
                   hover:border-purple-500/30 hover:text-purple-300
                   transition-all duration-200"
      >
        <Search className="h-4 w-4" />
        <span>搜索章节...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center
                       gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5
                       font-mono text-[10px] font-medium text-zinc-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* 搜索对话框 */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="搜索章节内容、标题..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? "搜索中..." : "没有找到结果"}
          </CommandEmpty>

          {/* 搜索建议 */}
          {suggestions.length > 0 && (
            <>
              <CommandGroup heading="搜索建议">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    value={suggestion.text}
                    onSelect={() => handleSearch(suggestion.text)}
                    className="cursor-pointer"
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <span
                      className="ml-2"
                      dangerouslySetInnerHTML={{ __html: suggestion.highlight }}
                    />
                    {suggestion.meta?.count && (
                      <span className="ml-auto text-xs text-zinc-500">
                        {suggestion.meta.count} 次
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* 保存的过滤器 */}
          {savedFilters.length > 0 && (
            <>
              <CommandGroup heading="保存的过滤器">
                {savedFilters.filter(f => f.is_pinned).map((filter) => (
                  <CommandItem
                    key={filter.id}
                    value={filter.name}
                    onSelect={() => handleApplyFilter(filter)}
                    className="cursor-pointer"
                  >
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="ml-2">{filter.name}</span>
                    {filter.description && (
                      <span className="ml-auto text-xs text-zinc-500 max-w-[200px] truncate">
                        {filter.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
                {savedFilters.filter(f => !f.is_pinned).slice(0, 3).map((filter) => (
                  <CommandItem
                    key={filter.id}
                    value={filter.name}
                    onSelect={() => handleApplyFilter(filter)}
                    className="cursor-pointer"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="ml-2">{filter.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* 快捷操作 */}
          {!query && (
            <CommandGroup heading="快捷操作">
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/novel/search/history");
                }}
                className="cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                <span className="ml-2">查看搜索历史</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/novel/search/filters");
                }}
                className="cursor-pointer"
              >
                <Filter className="h-4 w-4" />
                <span className="ml-2">管理过滤器</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>

        {/* 底部提示 */}
        {query && (
          <div className="border-t border-zinc-800 p-2 text-xs text-zinc-500">
            按 <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Enter</kbd> 搜索 "{query}"
          </div>
        )}
      </CommandDialog>
    </>
  );
}
