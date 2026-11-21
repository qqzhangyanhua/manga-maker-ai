import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NovelBackendClient, NovelBackendError } from "@/lib/novel-backend-client";

const segment = {
  segment_order: 1,
  content: "推门",
  scene_description: "旧书店",
  character_actions: "推门",
  dialogue: null,
  estimated_duration: 3,
  emotion_tone: "紧张",
};

const shot = {
  shot_order: 1,
  camera_angle: "平视",
  shot_size: "中景",
  panel_type: "dialogue",
  shot_description: "推门",
  composition_hint: "",
  character_ids: [],
  expression_types: [],
  prompt: "门开着",
  negative_prompt: "",
  location_key: "bookstore",
};

const panel = {
  scene_id: "scene-1",
  shot_id: "shot-1",
  image_url: "",
  generation_prompt: "门开着",
  dialogue_layout: null,
  has_dialogue: false,
  status: "pending",
};

function mockFetch(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

function client() {
  return new NovelBackendClient({
    baseUrl: "http://backend.test",
    timeout: 1000,
    maxRetries: 0,
  });
}

describe("小说后端画布客户端", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("剧本分析响应缺少片段时不会当成成功结果", async () => {
    mockFetch({ success: true });

    const error = await client()
      .analyzeScript({ chapter_content: "雨夜", chapter_number: 1 }, "token")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NovelBackendError);
    expect(error).toMatchObject({ originalError: "剧本分析响应格式不正确" });
  });

  it("镜头规划响应缺少镜头时不会当成成功结果", async () => {
    mockFetch({ success: true });

    const error = await client()
      .planShots(
        { script_content: "推门", scene_description: "书店", character_actions: "推门" },
        "token",
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NovelBackendError);
    expect(error).toMatchObject({ originalError: "镜头规划响应格式不正确" });
  });

  it("完整的剧本分析响应会按字段返回", async () => {
    mockFetch({ success: true, segments: [segment] });

    const result = await client().analyzeScript(
      { chapter_content: "雨夜", chapter_number: 1 },
      "token",
    );

    expect(result.segments[0]?.content).toBe("推门");
    expect(result.segments[0]?.dialogue).toBeNull();
  });

  it("完整的镜头、漫画图和角色识别响应会按字段返回", async () => {
    const api = client();

    mockFetch({ success: true, shots: [shot] });
    const shots = await api.planShots(
      { script_content: "推门", scene_description: "书店", character_actions: "推门" },
      "token",
    );
    expect(shots.shots[0]?.shot_description).toBe("推门");

    mockFetch({ success: true, panels: [panel] });
    const finals = await api.generateFinals({ scenes: [] }, "token");
    expect(finals.panels[0]?.shot_id).toBe("shot-1");
    expect(finals.panels[0]?.dialogue_layout).toBeNull();

    mockFetch({
      success: true,
      identified_characters: [{ character_name: "林晓", confidence: 0.9, reason: "对白" }],
      unmatched_names: ["店员"],
      matched_character_ids: ["char-1"],
    });
    const identified = await api.identifyCharacters(
      { scene_description: "书店", available_characters: [] },
      "token",
    );
    expect(identified.matched_character_ids).toEqual(["char-1"]);

    mockFetch({
      success: true,
      results: {
        "shot-1": {
          identified_characters: [],
          unmatched_names: [],
          matched_character_ids: ["char-1"],
        },
      },
      summary: { total_shots: 1, shots_with_characters: 1 },
    });
    const batch = await api.batchIdentifyCharacters(
      { shots: [], available_characters: [] },
      "token",
    );
    expect(batch.summary.total_shots).toBe(1);
    expect(batch.results["shot-1"]?.matched_character_ids).toEqual(["char-1"]);
  });
});
