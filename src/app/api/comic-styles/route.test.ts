import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    comicStyle: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "./route";

describe("API /api/comic-styles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("默认应只返回 enabled=true 的风格", async () => {
    (prisma.comicStyle.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "style-1",
        style_key: "manga",
        name_zh: "日式漫画",
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/comic-styles"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(1);
    expect(prisma.comicStyle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enabled: true },
      })
    );
  });

  it("enabled=false 时应不过滤 enabled 条件", async () => {
    (prisma.comicStyle.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/comic-styles?enabled=false"));

    expect(response.status).toBe(200);
    expect(prisma.comicStyle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      })
    );
  });

  it("数据库异常时应返回 500", async () => {
    (prisma.comicStyle.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("db error")
    );

    const response = await GET(new NextRequest("http://localhost/api/comic-styles"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("获取风格列表失败");
  });
});
