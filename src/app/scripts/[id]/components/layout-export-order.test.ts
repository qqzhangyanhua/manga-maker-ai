import { describe, expect, it } from "vitest";

import { panelsForLayoutExport } from "./layout-export-order";

describe("排版导出页签", () => {
  it("章节各自从 1 编号时，预览顺序是先第一章再第二章", () => {
    const ordered = panelsForLayoutExport(
      [
        { id: "ch2-1", panel_order: 1, chapter_id: "c2", generated_image: "b.png" },
        { id: "ch1-2", panel_order: 2, chapter_id: "c1", generated_image: "a2.png" },
        { id: "no-image", panel_order: 1, chapter_id: "c1" },
        { id: "ch1-1", panel_order: 1, chapter_id: "c1", image_url: "a1.png" },
      ],
      [
        { id: "c2", chapter_order: 2 },
        { id: "c1", chapter_order: 1 },
      ],
    );

    expect(ordered.map((panel) => panel.id)).toEqual(["ch1-1", "ch1-2", "ch2-1"]);
  });
});
