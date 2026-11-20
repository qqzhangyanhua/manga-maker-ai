import { describe, expect, it } from "vitest";

import type { ChapterSegmentRecord } from "@/lib/script-segment";
import { exportProjectJson } from "./export-json";

describe("exportProjectJson", () => {
  it("剧本片段来自章节行，形状仍是 id、text、start、end", async () => {
    const segment: ChapterSegmentRecord = {
      id: "44444444-4444-4444-8444-444444444444",
      chapter_id: "22222222-2222-4222-8222-222222222221",
      segment_order: 3,
      content: "章节上的雨夜",
      source_text_start: 0,
      source_text_end: 6,
    };
    const response = exportProjectJson({
      id: "33333333-3333-4333-8333-333333333333",
      title: "雨夜",
      description: null,
      style: null,
      status: "draft",
      cover_image: null,
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      updated_at: new Date("2026-01-02T00:00:00.000Z"),
      Story: null,
      script: { content: "全文" },
      panels: [],
    }, [segment]);

    const body = await response.json() as { script: { segmentedData: unknown } };

    expect(body.script.segmentedData).toEqual([
      { id: segment.id, text: "章节上的雨夜", start: 0, end: 6 },
    ]);
  });
});
