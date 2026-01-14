/**
 * 版本管理 API 服务层
 */
import type {
  ChapterVersion,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionComparisonRequest,
  VersionComparisonResponse,
  QualityScore,
} from "../types/version";

const NOVEL_API_BASE = "/api/novel";

/**
 * 获取章节所有版本列表
 */
export async function fetchChapterVersions(chapterId: string): Promise<ChapterVersion[]> {
  const response = await fetch(`${NOVEL_API_BASE}/versions/${chapterId}/list`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "获取版本列表失败");
  }

  return response.json();
}

/**
 * 创建新版本
 */
export async function createChapterVersion(
  chapterId: string,
  request: CreateVersionRequest
): Promise<ChapterVersion> {
  const response = await fetch(`${NOVEL_API_BASE}/versions/${chapterId}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "创建版本失败");
  }

  return response.json();
}

/**
 * 更新版本信息（选中状态、评分、备注）
 */
export async function updateChapterVersion(
  versionId: string,
  request: UpdateVersionRequest
): Promise<ChapterVersion> {
  const response = await fetch(`${NOVEL_API_BASE}/versions/${versionId}/update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "更新版本失败");
  }

  return response.json();
}

/**
 * 删除版本
 */
export async function deleteChapterVersion(versionId: string): Promise<void> {
  const response = await fetch(`${NOVEL_API_BASE}/versions/${versionId}/delete`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "删除版本失败");
  }
}

/**
 * 对版本进行质量分析
 */
export async function analyzeVersionQuality(versionId: string): Promise<QualityScore> {
  const response = await fetch(`${NOVEL_API_BASE}/versions/${versionId}/analyze`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "质量分析失败");
  }

  return response.json();
}

/**
 * 对比多个版本
 */
export async function compareVersions(
  request: VersionComparisonRequest
): Promise<VersionComparisonResponse> {
  const response = await fetch(`${NOVEL_API_BASE}/versions/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "版本对比失败");
  }

  return response.json();
}
