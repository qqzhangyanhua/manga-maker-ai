import { cn } from "./utils";

describe("cn 工具函数", () => {
  it("应合并类名并去除重复或假值", () => {
    const result = cn(
      "px-2",
      "text-sm",
      "px-2",
      { hidden: false, block: true },
      undefined,
      null
    );
    expect(result.split(" ").sort()).toEqual(["px-2", "text-sm", "block"].sort());
  });
});
