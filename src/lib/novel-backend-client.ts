/**
 * Novel-Backend HTTP Client
 *
 * 统一封装与 novel-backend 服务的 HTTP 通信
 * - 自动重试机制（指数退避）
 * - 统一错误处理
 * - 超时控制
 */

import { logInfo, logError } from "@/lib/api-logger";
import { fetchNovelBackend, NovelBackendError } from "@/lib/novel-backend-fetch";
import {
  isAnalyzeScriptResponse,
  isBatchIdentifyCharactersResponse,
  isGenerateFinalsResponse,
  isIdentifyCharactersResponse,
  isPlanShotsResponse,
} from "@/lib/novel-backend-response";

export { NovelBackendError };

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
 * 镜头规划器实际返回的一格。
 * 格子类型、镜头描述、构图、角色、表情、提示词、负面提示词、地点。
 */
export interface ShotDesignOutput {
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  character_ids: string[];
  expression_types: string[];
  prompt: string;
  negative_prompt: string;
  location_key: string;
}

/**
 * 镜头规划响应
 */
export interface PlanShotsResponse {
  success: boolean;
  shots: ShotDesignOutput[];
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
  dialogue_layout?: {
    bubbles: Array<{
      text: string;
      position: string;
      style: string;
    }>;
  };
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
    request: AnalyzeScriptRequest,
    userToken: string
  ): Promise<AnalyzeScriptResponse> {
    const endpoint = "/canvas/analyze-script";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 剧本分析", {
      url,
      chapterNumber: request.chapter_number,
      contentLength: request.chapter_content.length,
    });

    try {
      const response = await this.readCanvasPayload(
        url,
        {
          method: "POST",
          headers: this.canvasHeaders(userToken),
          body: JSON.stringify(request),
        },
        isAnalyzeScriptResponse,
        "剧本分析响应格式不正确",
      );

      logInfo("剧本分析成功", {
        segmentCount: response.segments.length,
      });

      return response;
    } catch (error) {
      logError("剧本分析失败", error, { url, request });
      throw this.wrapError("剧本分析失败", error);
    }
  }

  /**
   * 为剧本片段规划镜头
   */
  async planShots(request: PlanShotsRequest, userToken: string): Promise<PlanShotsResponse> {
    const endpoint = "/canvas/plan-shots";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 镜头规划", {
      url,
      scriptLength: request.script_content.length,
      characterCount: request.available_characters?.length || 0,
    });

    try {
      const response = await this.readCanvasPayload(
        url,
        {
          method: "POST",
          headers: this.canvasHeaders(userToken),
          body: JSON.stringify(request),
        },
        isPlanShotsResponse,
        "镜头规划响应格式不正确",
      );

      logInfo("镜头规划成功", {
        shotCount: response.shots.length,
      });

      return response;
    } catch (error) {
      logError("镜头规划失败", error, { url, request });
      throw this.wrapError("镜头规划失败", error);
    }
  }


  /**
   * 为场景图列表生成最终漫画图
   */
  async generateFinals(
    request: GenerateFinalsRequest,
    userToken: string
  ): Promise<GenerateFinalsResponse> {
    const endpoint = "/canvas/generate-finals";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 漫画图生成", {
      url,
      sceneCount: request.scenes.length,
      comicStyle: request.comic_style,
      addSpeechBubbles: request.add_speech_bubbles,
    });

    try {
      const response = await this.readCanvasPayload(
        url,
        {
          method: "POST",
          headers: this.canvasHeaders(userToken),
          body: JSON.stringify(request),
        },
        isGenerateFinalsResponse,
        "漫画图生成响应格式不正确",
      );

      logInfo("漫画图生成成功", {
        panelCount: response.panels.length,
      });

      return response;
    } catch (error) {
      logError("漫画图生成失败", error, { url, request });
      throw this.wrapError("漫画图生成失败", error);
    }
  }

  /**
   * 识别角色 - 从对话和场景描述中识别在场角色
   */
  async identifyCharacters(
    request: IdentifyCharactersRequest,
    userToken: string
  ): Promise<IdentifyCharactersResponse> {
    const endpoint = "/canvas/identify-characters";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 角色识别", {
      url,
      characterCount: request.available_characters.length,
      hasDialogue: !!request.dialogue,
    });

    try {
      const response = await this.readCanvasPayload(
        url,
        {
          method: "POST",
          headers: this.canvasHeaders(userToken),
          body: JSON.stringify(request),
        },
        isIdentifyCharactersResponse,
        "角色识别响应格式不正确",
      );

      logInfo("角色识别成功", {
        identifiedCount: response.identified_characters.length,
        unmatchedCount: response.unmatched_names.length,
      });

      return response;
    } catch (error) {
      logError("角色识别失败", error, { url, request });
      throw this.wrapError("角色识别失败", error);
    }
  }

  /**
   * 批量识别角色 - 为多个镜头识别在场角色
   */
  async batchIdentifyCharacters(
    request: BatchIdentifyCharactersRequest,
    userToken: string
  ): Promise<BatchIdentifyCharactersResponse> {
    const endpoint = "/canvas/batch-identify-characters";
    const url = `${this.baseUrl}${endpoint}`;

    logInfo("调用 novel-backend 批量角色识别", {
      url,
      shotCount: request.shots.length,
      characterCount: request.available_characters.length,
    });

    try {
      const response = await this.readCanvasPayload(
        url,
        {
          method: "POST",
          headers: this.canvasHeaders(userToken),
          body: JSON.stringify(request),
        },
        isBatchIdentifyCharactersResponse,
        "批量角色识别响应格式不正确",
      );

      logInfo("批量角色识别成功", {
        totalShots: response.summary.total_shots,
        shotsWithCharacters: response.summary.shots_with_characters,
      });

      return response;
    } catch (error) {
      logError("批量角色识别失败", error, { url, request });
      throw this.wrapError("批量角色识别失败", error);
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

  private async readCanvasPayload<T>(
    url: string,
    options: RequestInit,
    guard: (value: unknown) => value is T,
    invalidMessage: string,
  ): Promise<T> {
    const payload = await fetchNovelBackend(url, options, {
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    });
    if (!guard(payload)) {
      throw new NovelBackendError(invalidMessage);
    }
    return payload;
  }

  /** 画布调用统一带上创作者令牌，调用方不自己拼 Authorization。 */
  private canvasHeaders(userToken: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    };
  }

  private wrapError(message: string, error: unknown): NovelBackendError {
    const statusCode = error instanceof NovelBackendError ? error.statusCode : undefined;
    return new NovelBackendError(
      message,
      error instanceof Error ? error.message : String(error),
      statusCode
    );
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
