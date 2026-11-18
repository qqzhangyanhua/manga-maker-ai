import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    panel: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    comicStyle: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "./route";

const panelId = "7b1c9a52-2b8e-4f5e-9d3a-0c6f1e2a4b11";
const projectId = "3f1582a9-2f17-48cb-a8f9-b994005f6d2b";
const storyId = "39bd5294-8191-4089-9bfe-bfa7d7f7ee2a";
const userId = "3f2dfbe8-2e2f-4487-8d98-2611c87fca20";

const comicStyle = { id: "c0a8f1d2-5b6e-4c3a-9f7d-1e2b3c4d5e6f", name_zh: "日漫", name_en: "Manga", style_key: "manga" };

function buildPanel(projectStoryId: string | null, projectComicStyle: typeof comicStyle | null = null) {
  return {
    id: panelId,
    project_id: projectId,
    panel_order: 1,
    panel_type: "medium",
    importance: "high",
    description: "描述",
    dialogue: null,
    generated_image: "https://example.com/a.png",
    prompt_used: "prompt",
    visual_prompt: null,
    camera_angle: null,
    shot_size: null,
    view_count: 3,
    shared_at: null,
    show_prompt: true,
    is_shared: true,
    expression_type: null,
    project: {
      id: projectId,
      title: "项目",
      style: "日式漫画",
      user_id: userId,
      story_id: projectStoryId,
      comic_style: projectComicStyle,
    },
    character: null,
    outfit: null,
    scene: null,
  };
}

async function callGet() {
  const request = new NextRequest(`http://localhost/api/gallery/${panelId}`);
  return GET(request, { params: Promise.resolve({ id: panelId }) });
}

describe("API /api/gallery/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.panel.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: userId, name: "作者", image: null });
  });

  it("项目关联故事时应返回故事 ID，供详情页跳转剧本编辑页", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(buildPanel(storyId));

    const response = await callGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.story_id).toBe(storyId);
    expect(body.project_id).toBe(projectId);
  });

  it("项目没有关联故事时故事 ID 应为 null", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(buildPanel(null));

    const response = await callGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.story_id).toBeNull();
  });

  it("风格取项目的 comic_style_id 关联，不再把自由文本 style 当作 ID 查询", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(buildPanel(null, comicStyle));

    const response = await callGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.comic_style).toEqual(comicStyle);
    expect(body.project.style).toBe("日式漫画");
    expect(prisma.comicStyle.findUnique).not.toHaveBeenCalled();
  });

  it("项目没有设置风格时 comic_style 为 null", async () => {
    (prisma.panel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(buildPanel(null));

    const response = await callGet();
    const body = await response.json();

    expect(body.comic_style).toBeNull();
  });
});
