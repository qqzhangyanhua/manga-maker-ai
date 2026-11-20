import { describe, expect, it } from "vitest";

import { panelsForClientExport, panelsFromProjectPayload } from "./export-utils";

describe("客户端导出", () => {
  it("章节各自从 1 编号时，导出顺序是先第一章再第二章", () => {
    const panels = panelsFromProjectPayload({
      project: {
        panels: [
          {
            id: "ch2-1",
            panel_order: 1,
            chapter: { chapter_order: 2 },
            generated_image: "b.png",
            image_url: null,
            description: "第二章",
          },
          {
            id: "ch1-2",
            panel_order: 2,
            chapter: { chapter_order: 1 },
            generated_image: "a2.png",
            image_url: null,
            description: "第一章第二格",
          },
          {
            id: "blank",
            panel_order: 1,
            chapter: { chapter_order: 1 },
            generated_image: null,
            image_url: null,
            description: "没图",
          },
          {
            id: "ch1-1",
            panel_order: 1,
            chapter: { chapter_order: 1 },
            generated_image: null,
            image_url: "a1.png",
            description: "第一章第一格",
          },
        ],
      },
    });

    expect(panelsForClientExport(panels).map((panel) => panel.id)).toEqual(["ch1-1", "ch1-2", "ch2-1"]);
  });

  it("按项目连续编号时，导出顺序与 panel_order 相同", () => {
    const ordered = panelsForClientExport([
      {
        id: "p3",
        panel_order: 3,
        chapter: { chapter_order: 2 },
        generated_image: "c.png",
        image_url: null,
        description: "三",
      },
      {
        id: "p1",
        panel_order: 1,
        chapter: { chapter_order: 1 },
        generated_image: "a.png",
        image_url: null,
        description: "一",
      },
      {
        id: "p2",
        panel_order: 2,
        chapter: { chapter_order: 1 },
        generated_image: "b.png",
        image_url: null,
        description: "二",
      },
    ]);

    expect(ordered.map((panel) => panel.id)).toEqual(["p1", "p2", "p3"]);
  });
});
