import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useLayoutOperations } from "./useLayoutOperations";

const crossChapterMessage = "所选分镜不在同一章节，请选择同一章节内的连续分镜";

describe("批量排版错误提示", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("接口返回跨章节提示时，把这句话交给界面展示", async () => {
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: crossChapterMessage }),
      }),
    );

    const { result } = renderHook(() => useLayoutOperations({ onError }));

    await act(async () => {
      await result.current.applyLayout(["ch1", "ch2"], "2");
    });

    expect(onError).toHaveBeenCalledWith(crossChapterMessage);
  });
});
