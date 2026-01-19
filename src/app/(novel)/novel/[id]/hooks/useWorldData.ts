/**
 * 世界观记忆库 - SWR Hooks
 * 提供数据获取、缓存和自动刷新功能
 */
import useSWR, { SWRConfiguration, mutate } from "swr";
import { worldService } from "../services/worldService";
import {
  WorldEntry,
  EntryListResponse,
  ForeshadowingListResponse,
  EntryType,
  RelationTypesResponse,
  EntryTypesResponse,
} from "../types/world";

/** SWR 缓存键前缀 */
const CACHE_KEYS = {
  ENTRIES: "world-entries",
  ENTRY: "world-entry",
  FORESHADOWING: "world-foreshadowing",
  RELATION_TYPES: "world-relation-types",
  ENTRY_TYPES: "world-entry-types",
} as const;

/** 默认 SWR 配置 */
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryCount: 3,
};

/** 条目列表查询参数 */
export interface UseEntriesParams {
  type?: EntryType;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/** 转换查询参数为 API 格式 */
function toApiParams(params: UseEntriesParams): {
  type?: EntryType;
  search?: string;
  tags?: string;
  limit?: number;
  offset?: number;
} {
  return {
    ...params,
    tags: params.tags?.join(","),
  };
}

/**
 * 获取条目列表
 * @param projectId 项目 ID
 * @param params 查询参数
 * @param config SWR 配置
 */
export function useWorldEntries(
  projectId: string | null,
  params: UseEntriesParams = {},
  config?: SWRConfiguration<EntryListResponse>
) {
  const cacheKey = projectId
    ? [CACHE_KEYS.ENTRIES, projectId, JSON.stringify(params)]
    : null;

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<EntryListResponse>(
    cacheKey,
    () => worldService.listEntries(projectId!, toApiParams(params)),
    { ...defaultConfig, ...config }
  );

  return {
    entries: data?.entries ?? [],
    total: data?.total ?? 0,
    byType: data?.by_type ?? {},
    error,
    isLoading,
    isValidating,
    refresh: revalidate,
  };
}

/**
 * 获取单个条目详情
 * @param projectId 项目 ID
 * @param entryId 条目 ID
 * @param config SWR 配置
 */
export function useWorldEntry(
  projectId: string | null,
  entryId: string | null,
  config?: SWRConfiguration<WorldEntry>
) {
  const cacheKey = projectId && entryId
    ? [CACHE_KEYS.ENTRY, projectId, entryId]
    : null;

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<WorldEntry>(
    cacheKey,
    () => worldService.getEntry(projectId!, entryId!),
    { ...defaultConfig, ...config }
  );

  return {
    entry: data,
    error,
    isLoading,
    isValidating,
    refresh: revalidate,
  };
}

/**
 * 获取伏笔列表
 * @param projectId 项目 ID
 * @param config SWR 配置
 */
export function useForeshadowing(
  projectId: string | null,
  config?: SWRConfiguration<ForeshadowingListResponse>
) {
  const cacheKey = projectId
    ? [CACHE_KEYS.FORESHADOWING, projectId]
    : null;

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<ForeshadowingListResponse>(
    cacheKey,
    () => worldService.listForeshadowing(projectId!),
    { ...defaultConfig, ...config }
  );

  return {
    data,
    stats: data?.stats,
    planted: data?.planted ?? [],
    brewing: data?.brewing ?? [],
    revealed: data?.revealed ?? [],
    error,
    isLoading,
    isValidating,
    refresh: revalidate,
  };
}

/**
 * 获取关系类型列表
 * @param config SWR 配置
 */
export function useRelationTypes(config?: SWRConfiguration<RelationTypesResponse>) {
  const { data, error, isLoading } = useSWR<RelationTypesResponse>(
    CACHE_KEYS.RELATION_TYPES,
    () => worldService.getRelationTypes(),
    {
      ...defaultConfig,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000,
      ...config,
    }
  );

  return {
    types: data?.types ?? [],
    error,
    isLoading,
  };
}

/**
 * 获取条目类型定义
 * @param config SWR 配置
 */
export function useEntryTypes(config?: SWRConfiguration<EntryTypesResponse>) {
  const { data, error, isLoading } = useSWR<EntryTypesResponse>(
    CACHE_KEYS.ENTRY_TYPES,
    () => worldService.getEntryTypes(),
    {
      ...defaultConfig,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000,
      ...config,
    }
  );

  return {
    types: data?.types ?? {},
    error,
    isLoading,
  };
}

/**
 * 使条目列表缓存失效
 * @param projectId 项目 ID
 */
export function invalidateEntries(projectId: string) {
  mutate(
    (key) => Array.isArray(key) && key[0] === CACHE_KEYS.ENTRIES && key[1] === projectId,
    undefined,
    { revalidate: true }
  );
}

/**
 * 使单个条目缓存失效
 * @param projectId 项目 ID
 * @param entryId 条目 ID
 */
export function invalidateEntry(projectId: string, entryId: string) {
  mutate([CACHE_KEYS.ENTRY, projectId, entryId], undefined, { revalidate: true });
}

/**
 * 使伏笔列表缓存失效
 * @param projectId 项目 ID
 */
export function invalidateForeshadowing(projectId: string) {
  mutate([CACHE_KEYS.FORESHADOWING, projectId], undefined, { revalidate: true });
}

/**
 * 使项目所有世界观缓存失效
 * @param projectId 项目 ID
 */
export function invalidateAllWorldData(projectId: string) {
  invalidateEntries(projectId);
  invalidateForeshadowing(projectId);
  mutate(
    (key) => Array.isArray(key) && key[0] === CACHE_KEYS.ENTRY && key[1] === projectId,
    undefined,
    { revalidate: true }
  );
}
