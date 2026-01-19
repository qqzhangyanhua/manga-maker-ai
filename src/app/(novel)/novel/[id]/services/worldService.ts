/**
 * 世界观记忆库 - API 服务
 */
import {
  WorldEntry,
  EntryListResponse,
  CreateEntryRequest,
  UpdateEntryRequest,
  CreateRelationRequest,
  WorldRelation,
  ForeshadowingListResponse,
  UpdateForeshadowStatusRequest,
  PendingForeshadowingResponse,
  RelationTypesResponse,
  EntryTypesResponse,
  EntryType,
  ExtractionRequest,
  BatchSaveRequest,
  BatchSaveResponse,
  GenerateForeshadowingRequest,
  GenerateForeshadowingResponse,
} from "../types/world";

const WORLD_API_BASE = "/api/novel/world";

/**
 * 世界观记忆库 API 服务
 */
export const worldService = {
  /**
   * 获取条目列表
   */
  async listEntries(
    projectId: string,
    params?: {
      type?: EntryType;
      search?: string;
      tags?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<EntryListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.tags) searchParams.set("tags", params.tags);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const queryString = searchParams.toString();
    const url = `${WORLD_API_BASE}/projects/${projectId}/entries${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "获取条目列表失败");
    }
    return response.json();
  },

  /**
   * 获取单个条目
   */
  async getEntry(projectId: string, entryId: string): Promise<WorldEntry> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/entries/${entryId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "获取条目失败");
    }
    return response.json();
  },

  /**
   * 创建条目
   */
  async createEntry(projectId: string, data: CreateEntryRequest): Promise<WorldEntry> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "创建条目失败");
    }
    return response.json();
  },

  /**
   * 更新条目
   */
  async updateEntry(projectId: string, entryId: string, data: UpdateEntryRequest): Promise<WorldEntry> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "更新条目失败");
    }
    return response.json();
  },

  /**
   * 删除条目
   */
  async deleteEntry(projectId: string, entryId: string): Promise<void> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/entries/${entryId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "删除条目失败");
    }
  },

  /**
   * 创建关系
   */
  async createRelation(projectId: string, data: CreateRelationRequest): Promise<WorldRelation> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "创建关系失败");
    }
    return response.json();
  },

  /**
   * 删除关系
   */
  async deleteRelation(projectId: string, relationId: string): Promise<void> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/relations/${relationId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "删除关系失败");
    }
  },

  /**
   * 获取伏笔列表
   */
  async listForeshadowing(projectId: string): Promise<ForeshadowingListResponse> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/foreshadowing`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "获取伏笔列表失败");
    }
    return response.json();
  },

  /**
   * 更新伏笔状态
   */
  async updateForeshadowStatus(
    projectId: string,
    entryId: string,
    data: UpdateForeshadowStatusRequest
  ): Promise<WorldEntry> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/foreshadowing/${entryId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "更新伏笔状态失败");
    }
    return response.json();
  },

  /**
   * 获取待揭示伏笔
   */
  async getPendingForeshadowing(projectId: string, currentChapter: number): Promise<PendingForeshadowingResponse> {
    const response = await fetch(
      `${WORLD_API_BASE}/projects/${projectId}/foreshadowing/pending?current_chapter=${currentChapter}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "获取待揭示伏笔失败");
    }
    return response.json();
  },

  /**
   * 获取关系类型列表
   */
  async getRelationTypes(): Promise<RelationTypesResponse> {
    const response = await fetch(`${WORLD_API_BASE}/relation-types`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "获取关系类型失败");
    }
    return response.json();
  },

  /**
   * 获取条目类型列表
   */
  async getEntryTypes(): Promise<EntryTypesResponse> {
    const response = await fetch(`${WORLD_API_BASE}/entry-types`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "获取条目类型失败");
    }
    return response.json();
  },

  /**
   * 流式提取世界观条目 (SSE)
   * 使用 fetch + ReadableStream 处理 POST SSE
   */
  async *extractEntriesStream(
    projectId: string,
    request: ExtractionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<{ event: string; data: unknown }, void, unknown> {
    const url = `${WORLD_API_BASE}/projects/${projectId}/extract/stream`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "提取请求失败");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应流");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "message";
        let currentData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          } else if (line === "" && currentData) {
            try {
              const parsed = JSON.parse(currentData);
              yield { event: currentEvent, data: parsed };
            } catch {
              console.warn("Failed to parse SSE data:", currentData);
            }
            currentEvent = "message";
            currentData = "";
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * 批量保存提取的条目
   */
  async batchSaveExtractedEntries(
    projectId: string,
    request: BatchSaveRequest
  ): Promise<BatchSaveResponse> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/extract/batch-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "批量保存失败");
    }
    return response.json();
  },

  /**
   * AI 生成伏笔建议
   */
  async generateForeshadowing(
    projectId: string,
    request: GenerateForeshadowingRequest
  ): Promise<GenerateForeshadowingResponse> {
    const response = await fetch(`${WORLD_API_BASE}/projects/${projectId}/generate-foreshadowing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(error.detail || error.error || "生成伏笔失败");
    }
    return response.json();
  },
};
