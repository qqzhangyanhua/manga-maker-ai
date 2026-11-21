import { describe, expect, it } from "vitest";
import { readCanvasError } from "./canvas-api";

describe("readCanvasError", () => {
  it("HTTP 401 一律提示重新登录，即使响应体带 success: false", async () => {
    const response = new Response(
      JSON.stringify({ success: false, error: "未登录" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );

    await expect(readCanvasError(response, "生成失败")).resolves.toBe("请重新登录");
  });
});
