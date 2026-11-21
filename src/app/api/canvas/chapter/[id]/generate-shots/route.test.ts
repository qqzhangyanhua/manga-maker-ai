import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CREATOR_TOKEN = "creator-session-token";
const USER_ID = "user-1";
const CHAPTER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const SEGMENT_ID = "33333333-3333-4333-8333-333333333333";

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
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    scriptSegment: {
      count: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    projectCharacter: {
      findMany: vi.fn(),
    },
  },
}));

import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { POST } from "./route";

function planFetch(status: number, body: string) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/canvas/plan-shots")) {
      return new Response(body, {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`未预期的请求: ${url}`);
  });
}

function bearerOnPlan(fetchMock: ReturnType<typeof vi.fn>): string | null {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/canvas/plan-shots"));
  const init = call?.[1] as RequestInit | undefined;
  return new Headers(init?.headers).get("authorization");
}

async function generateShots() {
  return POST(new Request(`http://localhost/api/canvas/chapter/${CHAPTER_ID}/generate-shots`, { method: "POST" }), {
    params: Promise.resolve({ id: CHAPTER_ID }),
  });
}

describe("生成分镜携带创作者令牌", () => {
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
      script_segments: [{
        id: SEGMENT_ID,
        content: "推门进入书店",
        scene_description: "旧书店",
        character_actions: "推门",
      }],
    } as never);
    vi.mocked(prisma.timelineChapter.update).mockResolvedValue({} as never);
    vi.mocked(prisma.scriptSegment.count).mockResolvedValue(1);
    vi.mocked(prisma.character.findMany).mockResolvedValue([]);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ story_id: null } as never);
    vi.mocked(prisma.projectCharacter.findMany).mockResolvedValue([]);
  });

  it("小说后端返回 401 时，出站请求带当前用户的 Bearer 令牌，路由返回 401", async () => {
    const fetchMock = planFetch(401, JSON.stringify({ detail: "unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateShots();
    const data = await response.json();

    expect(bearerOnPlan(fetchMock)).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(401);
    expect(data).toEqual({ success: false, error: "请重新登录" });
  });

  it("小说后端返回 403 时，路由同样返回 401", async () => {
    const fetchMock = planFetch(403, JSON.stringify({ detail: "forbidden" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateShots();

    expect(bearerOnPlan(fetchMock)).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ success: false, error: "请重新登录" });
  });

  it("小说后端返回其它错误时仍是 502，不会当成登录过期", async () => {
    const fetchMock = planFetch(400, JSON.stringify({ detail: "bad request" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await generateShots();

    expect(bearerOnPlan(fetchMock)).toBe(`Bearer ${CREATOR_TOKEN}`);
    expect(response.status).toBe(502);
  });
});
