import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CREATOR_TOKEN = "creator-session-token";
const USER_ID = "user-finals";
const CHAPTER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const SEGMENT_ID = "33333333-3333-4333-8333-333333333333";
const SHOT_ID = "77777777-7777-4777-8777-777777777777";
const LIBRARY_CHARACTER_ID = "88888888-8888-4888-8888-888888888888";

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

vi.mock("@/lib/minio", () => ({
  ensureBucketExists: vi.fn(),
  minioClient: {},
  MINIO_BUCKET: "input-image",
  getPublicUrl: (name: string) => `http://minio.local/${name}`,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    timelineChapter: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    scriptSegment: {
      findMany: vi.fn(),
    },
    panel: {
      findMany: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
    projectCharacter: {
      findMany: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

function shotPanel() {
  return {
    id: SHOT_ID,
    segment_id: SEGMENT_ID,
    panel_order: 1,
    camera_angle: "eye",
    shot_size: "medium",
    panel_type: "action",
    description: "推门",
    composition_hint: "",
    location_key: "bookstore",
    panel_characters: [],
    pipeline_state: null,
    scene_id: null,
    visual_prompt: "a door",
    negative_prompt: "",
    generated_image: null,
    generation_status: "pending",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function bearerFor(fetchMock: ReturnType<typeof vi.fn>, path: string): string | null {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes(path));
  const init = call?.[1] as RequestInit | undefined;
  return new Headers(init?.headers).get("authorization");
}

async function generateFinals() {
  return POST(new Request(`http://localhost/api/canvas/chapter/${CHAPTER_ID}/generate-finals`, { method: "POST" }), {
    params: Promise.resolve({ id: CHAPTER_ID }),
  });
}

describe("生成最终漫画图携带创作者令牌", () => {
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
      timeline_id: "44444444-4444-4444-8444-444444444444",
      project_chapter_id: "55555555-5555-4555-8555-555555555555",
      project_chapter: { project_id: PROJECT_ID },
      timeline: {
        user_id: USER_ID,
        project_id: PROJECT_ID,
        novel_project_id: "66666666-6666-4666-8666-666666666666",
      },
    } as never);
    vi.mocked(prisma.timelineChapter.findUniqueOrThrow).mockResolvedValue({
      id: CHAPTER_ID,
      timeline_id: "44444444-4444-4444-8444-444444444444",
      character_ids: [],
    } as never);
    vi.mocked(prisma.timelineChapter.update).mockResolvedValue({} as never);
    vi.mocked(prisma.scriptSegment.findMany).mockResolvedValue([
      { id: SEGMENT_ID, dialogue: null, scene_description: "旧书店" },
    ] as never);
    vi.mocked(prisma.panel.findMany).mockResolvedValue([shotPanel()] as never);
    vi.mocked(prisma.character.findMany).mockResolvedValue([]);
    vi.mocked(prisma.projectCharacter.findMany).mockResolvedValue([]);
  });

  it("小说后端返回 401 时，出站请求带当前用户的 Bearer 令牌，路由返回 401", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/canvas/generate-finals")) {
        return new Response(JSON.stringify({ detail: "unauthorized" }), { status: 401 });
      }
      throw new Error(`未预期的请求: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateFinals();
    const data = await response.json();

    expect(bearerFor(fetchMock, "/canvas/generate-finals")).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(401);
    expect(data.error).toBe("请重新登录");
  });

  it("小说后端返回 403 时，路由同样返回 401", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/canvas/generate-finals")) {
        return new Response(JSON.stringify({ detail: "forbidden" }), { status: 403 });
      }
      throw new Error(`未预期的请求: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateFinals();

    expect(bearerFor(fetchMock, "/canvas/generate-finals")).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(401);
  });

  it("批量识别角色被拒绝时，不再继续生成漫画图，并返回 401", async () => {
    vi.mocked(prisma.timelineChapter.findUniqueOrThrow).mockResolvedValue({
      id: CHAPTER_ID,
      timeline_id: "44444444-4444-4444-8444-444444444444",
      character_ids: [LIBRARY_CHARACTER_ID],
    } as never);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/canvas/batch-identify-characters")) {
        return new Response(JSON.stringify({ detail: "unauthorized" }), { status: 401 });
      }
      if (url.includes("/canvas/generate-finals")) {
        return new Response(JSON.stringify({ success: true, panels: [{ shot_id: SHOT_ID }] }), { status: 200 });
      }
      throw new Error(`未预期的请求: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateFinals();

    expect(bearerFor(fetchMock, "/canvas/batch-identify-characters")).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/canvas/generate-finals"))).toBe(false);
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("请重新登录");
  });

  it("批量识别角色返回 403 时，路由同样返回 401", async () => {
    vi.mocked(prisma.timelineChapter.findUniqueOrThrow).mockResolvedValue({
      id: CHAPTER_ID,
      timeline_id: "44444444-4444-4444-8444-444444444444",
      character_ids: [LIBRARY_CHARACTER_ID],
    } as never);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/canvas/batch-identify-characters")) {
        return new Response(JSON.stringify({ detail: "forbidden" }), { status: 403 });
      }
      throw new Error(`未预期的请求: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateFinals();

    expect(response.status).toBe(401);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/canvas/generate-finals"))).toBe(false);
  });

  it("小说后端返回其它错误时仍是 502，不会当成登录过期", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/canvas/generate-finals")) {
        return new Response(JSON.stringify({ detail: "bad request" }), { status: 400 });
      }
      throw new Error(`未预期的请求: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateFinals();
    const data = await response.json();

    expect(bearerFor(fetchMock, "/canvas/generate-finals")).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(502);
    expect(data.error).toBe("漫画图生成失败");
  });
});
