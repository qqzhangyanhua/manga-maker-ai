import { describe, expect, it } from "vitest";

import { insertAtEndAnchor } from "./insert-at-end";

describe("插入到末尾", () => {
  it("章节各自从 1 编号时，锚在最后一章的最后一格，而不是编号最大的那格", () => {
    const anchor = insertAtEndAnchor([
      { id: "ch1-long", panel_order: 3, chapter_id: "c1", chapter: { chapter_order: 1 } },
      { id: "ch2-end", panel_order: 1, chapter_id: "c2", chapter: { chapter_order: 2 } },
      { id: "ch1-1", panel_order: 1, chapter_id: "c1", chapter: { chapter_order: 1 } },
    ]);

    expect(anchor?.id).toBe("ch2-end");
    expect(anchor?.panel_order).toBe(1);
  });

  it("按项目连续编号时，锚仍是阅读顺序的最后一格", () => {
    const anchor = insertAtEndAnchor([
      { id: "ch2-2", panel_order: 4, chapter: { chapter_order: 2 } },
      { id: "ch1-1", panel_order: 1, chapter: { chapter_order: 1 } },
      { id: "ch2-1", panel_order: 3, chapter: { chapter_order: 2 } },
    ]);

    expect(anchor?.id).toBe("ch2-2");
  });
});
