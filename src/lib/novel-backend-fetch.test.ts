import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNovelBackend } from "@/lib/novel-backend-fetch";

describe("fetchNovelBackend", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("不是 Error 的失败不会按 HTTP 500 重试", async () => {
    vi.useFakeTimers();
    const failure = { message: "HTTP 500", name: "Error" };
    const fetchMock = vi.fn().mockRejectedValue(failure);
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchNovelBackend(
      "http://backend.test/canvas/plan-shots",
      { method: "POST" },
      { timeout: 5000, maxRetries: 2 },
    );
    const assertion = expect(pending).rejects.toBe(failure);
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("HTTP 500 的 Error 仍会重试，成功后返回 JSON 本身", async () => {
    vi.useFakeTimers();
    const payload = { success: true, shots: [] };
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("HTTP 500: down"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchNovelBackend(
      "http://backend.test/canvas/plan-shots",
      { method: "POST" },
      { timeout: 5000, maxRetries: 1 },
    );
    const assertion = expect(pending).resolves.toEqual(payload);
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
