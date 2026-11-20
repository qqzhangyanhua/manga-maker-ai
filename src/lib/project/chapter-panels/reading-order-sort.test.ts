import { describe, expect, it } from "vitest";

import { sortByReadingOrder } from "./reading-order-sort";

describe("阅读顺序排序", () => {
  it("章节和章节内顺序都相同时按 id 排", () => {
    const ordered = sortByReadingOrder([
      { id: "b", panel_order: 1, chapter_order: 1 },
      { id: "a", panel_order: 1, chapter_order: 1 },
    ]);

    expect(ordered.map((panel) => panel.id)).toEqual(["a", "b"]);
  });
});
