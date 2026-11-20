import { describe, expect, it } from "vitest";

import { panelsForAutoArrange } from "./arrange-order";

describe("排版页自动编排", () => {
  it("章节各自从 1 编号时，从上到下先排第一章再排第二章", () => {
    const ordered = panelsForAutoArrange([
      { id: "ch2-1", panel_order: 1, chapter: { chapter_order: 2 }, generated_image: "b.png" },
      { id: "ch1-2", panel_order: 2, chapter: { chapter_order: 1 }, generated_image: "a2.png" },
      { id: "blank", panel_order: 3, chapter: { chapter_order: 1 }, generated_image: null },
      { id: "ch1-1", panel_order: 1, chapter: { chapter_order: 1 }, generated_image: "a1.png" },
    ]);

    expect(ordered.map((panel) => panel.id)).toEqual(["ch1-1", "ch1-2", "ch2-1"]);
  });
});
