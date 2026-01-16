/**
 * RAG Vector Database Management - Type Definitions
 *
 * TypeScript types for RAG management frontend components.
 * All types match backend API response formats with camelCase naming.
 */

// 章节索引状态枚举
export enum IndexStatus {
  INDEXED = "indexed",
  NEED_REBUILD = "need_rebuild",
  NOT_INDEXED = "not_indexed"
}

// 章节索引记录
export interface ChapterIndexRecord {
  chapterId: string;
  projectId: string;
  projectName: string;
  chapterNumber: number;
  title: string;
  wordCount: number;
  indexedAt: string | null;
  updatedAt: string;
  status: IndexStatus;
}

// 一致性检查结果
export interface ConsistencyCheckResult {
  totalInPg: number;
  totalInChroma: number;
  notIndexed: ChapterIndexRecord[];
  orphaned: string[];
  needRebuild: ChapterIndexRecord[];
  healthScore: number;
}

// 系统统计
export interface RAGStats {
  enabled: boolean;
  collectionName: string;
  totalDocuments: number;
  embeddingModel: string;
  dbSize?: number;
  indexSuccessRate?: number;
  avgSimilarityScore?: number;
}

// 维护操作类型
export type MaintenanceOperation = "export" | "import" | "rebuild" | "cleanup";

// 操作状态
export type OperationStatus = "success" | "failed" | "partial";

// 维护日志
export interface MaintenanceLog {
  id: string;
  timestamp: string;
  operation: MaintenanceOperation;
  details: string;
  status: OperationStatus;
  userId: string;
}

// 最近活动
export interface RecentActivity {
  timestamp: string;
  projectName: string;
  chapterNumber: number;
  chapterTitle: string;
  status: "success" | "failed";
}

// API 响应类型

// 统计 API 响应
export interface StatsResponse {
  stats: RAGStats;
  recentActivity: RecentActivity[];
}

// 一致性检查 API 响应
export interface ConsistencyCheckResponse {
  result: ConsistencyCheckResult;
}

// 重建索引 API 请求
export interface RebuildIndexRequest {
  chapterIds?: string[];
  force?: boolean;
}

// 重建索引 API 响应
export interface RebuildIndexResponse {
  success: boolean;
  rebuiltCount: number;
  failedCount: number;
  errors?: string[];
}

// 导出向量 API 响应
export interface ExportVectorsResponse {
  downloadUrl: string;
  filename: string;
  size: number;
}

// 导入向量 API 请求
export interface ImportVectorsRequest {
  file: File;
  overwrite?: boolean;
}

// 导入向量 API 响应
export interface ImportVectorsResponse {
  success: boolean;
  importedCount: number;
  errors?: string[];
}

// 清理孤立向量 API 响应
export interface CleanupOrphansResponse {
  success: boolean;
  deletedCount: number;
}

// 维护日志列表 API 响应
export interface MaintenanceLogsResponse {
  logs: MaintenanceLog[];
  total: number;
  page: number;
  pageSize: number;
}

// 错误响应
export interface ErrorResponse {
  error: string;
  details?: string;
}
