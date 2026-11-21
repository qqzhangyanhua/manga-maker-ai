import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CREATOR_TOKEN = "creator-session-token";
const USER_ID = "user-1";
const CHAPTER_ID = "chapter-1";

const { mockCookies, mockCookieGet } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet });
  return { mockCookies, mockCookieGet };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    timelineChapter: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    canvasTimeline: {
      findUnique: vi.fn(),
    },
    novelChapter: {
      findUnique: vi.fn(),
    },
    scriptSegment: {
      create: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

function analyzeFetch(status: number, body: string) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/health")) {
      return new Response("ok", { status: 200 });
    }
    if (url.includes("/canvas/analyze-script")) {
      return new Response(body, {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`未预期的请求: ${url}`);
  });
}

function bearerOnAnalyze(fetchMock: ReturnType<typeof vi.fn>): string | null {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/canvas/analyze-script"));
  const init = call?.[1] as RequestInit | undefined;
  return new Headers(init?.headers).get("authorization");
}

async function generateScript() {
  return POST(new Request("http://localhost/api/canvas/chapter/chapter-1/generate-script", { method: "POST" }), {
    params: Promise.resolve({ id: CHAPTER_ID }),
  });
}

describe("生成剧本携带创作者令牌", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({ get: mockCookieGet });
    mockCookieGet.mockImplementation((name: string) =>
      name === "comicai_session" ? { value: CREATOR_TOKEN } : undefined
    );
    vi.mocked(verifyAuthToken).mockReturnValue({
      userId: USER_ID,
      email: "creator@example.com",
    });
    vi.mocked(prisma.timelineChapter.findUnique).mockResolvedValue({
      id: CHAPTER_ID,
      timeline_id: "timeline-1",
      chapter_id: "novel-chapter-1",
      chapter_number: 1,
      project_chapter_id: "project-chapter-1",
    } as never);
    vi.mocked(prisma.canvasTimeline.findUnique).mockResolvedValue({
      user_id: USER_ID,
    } as never);
    vi.mocked(prisma.novelChapter.findUnique).mockResolvedValue({
      id: "novel-chapter-1",
      content: "雨夜里，主角推开了旧书店的门。",
      status: "completed",
      title: "第一章",
      chapter_number: 1,
      word_count: 16,
      project_id: "novel-project-1",
    } as never);
    vi.mocked(prisma.timelineChapter.update).mockResolvedValue({} as never);
  });

  it("小说后端返回 401 时，出站请求带当前用户的 Bearer 令牌，路由返回 401", async () => {
    const fetchMock = analyzeFetch(401, JSON.stringify({ detail: "unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateScript();
    const data = await response.json();

    expect(bearerOnAnalyze(fetchMock)).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(401);
    expect(data.error).toBe("请重新登录");
  });

  it("小说后端返回 403 时，路由同样返回 401", async () => {
    const fetchMock = analyzeFetch(403, JSON.stringify({ detail: "forbidden" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateScript();

    expect(bearerOnAnalyze(fetchMock)).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("请重新登录");
  });

  it("小说后端返回其它错误时仍是 502，不会当成登录过期", async () => {
    const fetchMock = analyzeFetch(400, JSON.stringify({ detail: "bad request" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateScript();
    const data = await response.json();

    expect(bearerOnAnalyze(fetchMock)).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(502);
    expect(data.error).toBe("剧本生成失败");
  });

  it("小说后端接受请求时，剧本生成仍成功，并带上同一个 Bearer 令牌", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return new Response("ok", { status: 200 });
      }
      if (url.includes("/canvas/analyze-script")) {
        return new Response(JSON.stringify({
          success: true,
          segments: [{
            segment_order: 1,
            content: "推门",
            scene_description: "旧书店",
            character_actions: "推门",
            dialogue: null,
            estimated_duration: 3,
            emotion_tone: "紧张",
          }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      throw new Error(`未预期的请求: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(prisma.scriptSegment.create).mockResolvedValue({
      id: "segment-1",
      segment_order: 1,
      content: "推门",
    } as never);

    const response = await generateScript();
    const data = await response.json();

    expect(bearerOnAnalyze(fetchMock)).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.metadata.segment_count).toBe(1);
  });
});
