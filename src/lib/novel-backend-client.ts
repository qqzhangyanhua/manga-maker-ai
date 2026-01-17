/**
 * Novel-Backend HTTP Client
 *
 * 统一封装与 novel-backend 服务的 HTTP 通信
 * - 自动重试机制（指数退避）
 * - 统一错误处理
 * - 超时控制
 */

import { logInfo, logError } from "@/lib/api-logger";

/**
 * Novel-Backend 客户端配置
 */
interface NovelBackendClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * 剧本分析请求
 */
export interface AnalyzeScriptRequest {
  chapter_content: string;
  chapter_number: number;
}

/**
 * 剧本片段输出
 */
export interface ScriptSegmentOutput {
  segment_order: number;
  content: string;
  scene_description: string;
  character_actions: string;
  dialogue: string | null;
  estimated_duration: number;
  emotion_tone: string;
  source_text_start?: number;
  source_text_end?: number;
}

/**
 * 剧本分析响应
 */
export interface AnalyzeScriptResponse {
  success: boolean;
  segments: ScriptSegmentOutput[];
}

/**
 * 镜头规划请求
 */
export interface PlanShotsRequest {
  script_content: string;
  scene_description: string;
  character_actions: string;
  available_characters?: Array<{
    id: string;
    name: string;
    reference_image?: string;
  }>;
}

/**
 * 镜头设计输出
 */
export interface ShotDesignOutput {
  shot_order: number;
  shot_type: string;
  camera_angle: string;
  shot_size: string;
  character_focus: string | null;
  action_description: string;
  dialogue: string | null;
  visual_notes: string | null;
  estimated_duration: number;
}

/**
 * 镜头规划响应
 */
export interface PlanShotsResponse {
  success: boolean;
  shots: ShotDesignOutput[];
}

/**
 * 场景生成请求 - 镜头输入
 */
export interface ShotInput {
  shot_id: string;
  camera_angle: string;
  shot_size: string;
  shot_description: string;
  prompt: string;
  character_ids?: string[];
}

/**
 * 场景图片输出
 */
export interface SceneImageOutput {
  shot_id: string;
  image_url: string;
  generation_prompt: string;
  status: string;
}

/**
 * 场景生成请求
 */
export interface GenerateScenesRequest {
  shots: ShotInput[];
  style?: string;
  pure_scene_mode?: boolean;
}

/**
 * 场景生成响应
 */
export interface GenerateScenesResponse {
  success: boolean;
  scenes: SceneImageOutput[];
}

/**
 * 漫画图生成请求 - 场景输入
 */
export interface SceneInput {
  scene_id: string;
  shot_id: string;
  image_url: string;
  dialogue?: string | null;
  character_names?: string[];
}

/**
 * 漫画面板输出
 */
export interface ComicPanelOutput {
  scene_id: string;
  shot_id: string;
  image_url: string;
  generation_prompt: string;
  has_dialogue: boolean;
  status: string;
}

/**
 * 漫画图生成请求
 */
export interface GenerateFinalsRequest {
  scenes: SceneInput[];
  comic_style?: string;
  add_speech_bubbles?: boolean;
}

/**
 * 漫画图生成响应
 */
export interface GenerateFinalsResponse {
  success: boolean;
  panels: ComicPanelOutput[];
}

/**
 * 角色识别请求
 */
export interface IdentifyCharactersRequest {
  dialogue?: string | null;
  scene_description: string;
  available_characters: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

/**
 * 识别到的角色
 */
export interface IdentifiedCharacter {
  character_name: string;
  confidence: number;
  reason: string;
}

/**
 * 角色识别响应
 */
export interface IdentifyCharactersResponse {
  success: boolean;
  identified_characters: IdentifiedCharacter[];
  unmatched_names: string[];
  matched_character_ids: string[];
}

/**
 * 批量角色识别请求
 */
export interface BatchIdentifyCharactersRequest {
  shots: Array<{
    shot_id: string;
    dialogue?: string | null;
    description: string;
  }>;
  available_characters: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

/**
 * 批量角色识别响应
 */
export interface BatchIdentifyCharactersResponse {
  success: boolean;
  results: Record<string, {
    identified_characters: IdentifiedCharacter[];
    unmatched_names: string[];
    matched_character_ids: string[];
  }>;
  summary: {
    total_shots: number;
    shots_with_characters: number;
  };
}

/**
 * Novel-Backend 服务客户端
 */
export class NovelBackendClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config?: Partial<NovelBackendClientConfig>) {
    this.baseUrl =
      config?.baseUrl ||
      process.env.NOVEL_BACKEND_URL ||
      "http://localhost:8000";
    this.timeout = config?.timeout || 60000; // 60秒
    this.maxRetries = config?.maxRetries || 3;
  }

  /**
   * 分析章节文本，生成剧本片段
   */
  async analyzeScript(
    request: AnalyzeScriptRequest
  ): Promise<AnalyzeScriptResponse> {
    const endpoint = "/api/novel/canvas/analyze-script";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 剧本分析", {
      url,
      chapterNumber: request.chapter_number,
      contentLength: request.chapter_content.length,
    });

    try {
      const response = await this.fetchWithRetry<AnalyzeScriptResponse>(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        }
      );

      logInfo("剧本分析成功", {
        segmentCount: response.segments.length,
      });

      return response;
    } catch (error) {
      logError("剧本分析失败", error, { url, request });
      throw new NovelBackendError(
        "剧本分析失败",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 为剧本片段规划镜头
   */
  async planShots(request: PlanShotsRequest): Promise<PlanShotsResponse> {
    const endpoint = "/api/novel/canvas/plan-shots";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 镜头规划", {
      url,
      scriptLength: request.script_content.length,
      characterCount: request.available_characters?.length || 0,
    });

    try {
      const response = await this.fetchWithRetry<PlanShotsResponse>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      logInfo("镜头规划成功", {
        shotCount: response.shots.length,
      });

      return response;
    } catch (error) {
      logError("镜头规划失败", error, { url, request });
      throw new NovelBackendError(
        "镜头规划失败",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 为镜头列表生成场景图
   */
  async generateScenes(
    request: GenerateScenesRequest
  ): Promise<GenerateScenesResponse> {
    const endpoint = "/api/novel/canvas/generate-scenes";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 场景图生成", {
      url,
      shotCount: request.shots.length,
      style: request.style,
    });

    try {
      const response = await this.fetchWithRetry<GenerateScenesResponse>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      logInfo("场景图生成成功", {
        sceneCount: response.scenes.length,
      });

      return response;
    } catch (error) {
      logError("场景图生成失败", error, { url, request });
      throw new NovelBackendError(
        "场景图生成失败",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 为场景图列表生成最终漫画图
   */
  async generateFinals(
    request: GenerateFinalsRequest
  ): Promise<GenerateFinalsResponse> {
    const endpoint = "/api/novel/canvas/generate-finals";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 漫画图生成", {
      url,
      sceneCount: request.scenes.length,
      comicStyle: request.comic_style,
      addSpeechBubbles: request.add_speech_bubbles,
    });

    try {
      const response = await this.fetchWithRetry<GenerateFinalsResponse>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      logInfo("漫画图生成成功", {
        panelCount: response.panels.length,
      });

      return response;
    } catch (error) {
      logError("漫画图生成失败", error, { url, request });
      throw new NovelBackendError(
        "漫画图生成失败",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 识别角色 - 从对话和场景描述中识别在场角色
   */
  async identifyCharacters(
    request: IdentifyCharactersRequest
  ): Promise<IdentifyCharactersResponse> {
    const endpoint = "/api/novel/canvas/identify-characters";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 角色识别", {
      url,
      characterCount: request.available_characters.length,
      hasDialogue: !!request.dialogue,
    });

    try {
      const response = await this.fetchWithRetry<IdentifyCharactersResponse>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      logInfo("角色识别成功", {
        identifiedCount: response.identified_characters.length,
        unmatchedCount: response.unmatched_names.length,
      });

      return response;
    } catch (error) {
      logError("角色识别失败", error, { url, request });
      throw new NovelBackendError(
        "角色识别失败",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 批量识别角色 - 为多个镜头识别在场角色
   */
  async batchIdentifyCharacters(
    request: BatchIdentifyCharactersRequest
  ): Promise<BatchIdentifyCharactersResponse> {
    const endpoint = "/api/novel/canvas/batch-identify-characters";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 批量角色识别", {
      url,
      shotCount: request.shots.length,
      characterCount: request.available_characters.length,
    });

    try {
      const response = await this.fetchWithRetry<BatchIdentifyCharactersResponse>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      logInfo("批量角色识别成功", {
        totalShots: response.summary.total_shots,
        shotsWithCharacters: response.summary.shots_with_characters,
      });

      return response;
    } catch (error) {
      logError("批量角色识别失败", error, { url, request });
      throw new NovelBackendError(
        "批量角色识别失败",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    const url = `${this.baseUrl}/health`;

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5秒超时
      });

      return response.ok;
    } catch (error) {
      logError("novel-backend 健康检查失败", error, { url });
      return false;
    }
  }

  /**
   * 带重试的 Fetch 请求
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<T> {
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查 HTTP 状态码
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      // 解析 JSON 响应
      const data = await response.json();
      return data as T;
    } catch (error) {
      // 判断是否需要重试
      const shouldRetry =
        retryCount < this.maxRetries &&
        this.isRetryableError(error as Error);

      if (shouldRetry) {
        const delay = this.getRetryDelay(retryCount);
        logInfo(`重试请求 (${retryCount + 1}/${this.maxRetries})`, {
          url,
          delayMs: delay,
        });

        await this.sleep(delay);
        return this.fetchWithRetry<T>(url, options, retryCount + 1);
      }

      // 不重试，直接抛出错误
      throw error;
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: Error): boolean {
    // 网络超时、连接错误可重试
    if (error.name === "AbortError" || error.name === "TypeError") {
      return true;
    }

    // 5xx 服务器错误可重试
    const message = error.message;
    if (
      message.includes("HTTP 500") ||
      message.includes("HTTP 502") ||
      message.includes("HTTP 503") ||
      message.includes("HTTP 504")
    ) {
      return true;
    }

    return false;
  }

  /**
   * 获取重试延迟（指数退避）
   */
  private getRetryDelay(retryCount: number): number {
    // 指数退避: 1s, 2s, 4s
    return Math.pow(2, retryCount) * 1000;
  }

  /**
   * 延迟工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Novel-Backend 自定义错误
 */
export class NovelBackendError extends Error {
  constructor(
    message: string,
    public readonly originalError?: string
  ) {
    super(message);
    this.name = "NovelBackendError";
  }
}

/**
 * 创建默认客户端实例（单例模式）
 */
let defaultClient: NovelBackendClient | null = null;

export function getNovelBackendClient(): NovelBackendClient {
  if (!defaultClient) {
    defaultClient = new NovelBackendClient();
  }
  return defaultClient;
}
