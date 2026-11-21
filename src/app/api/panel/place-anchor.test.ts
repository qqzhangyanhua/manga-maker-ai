import { describe, expect, it } from "vitest";

import { parsePlaceAnchor } from "./place-anchor";

const missing = "请指定 before、after 或章节中的恰好一种";
const multiple = "只能指定一种锚点";

describe("parsePlaceAnchor", () => {
  it("只接受 before", () => {
    expect(parsePlaceAnchor({ before: "panel-b", panel_id: "panel-a" })).toStrictEqual({
      ok: true,
      anchor: { before: "panel-b" },
    });
  });

  it("只接受 after", () => {
    expect(parsePlaceAnchor({ after: " panel-c " })).toStrictEqual({
      ok: true,
      anchor: { after: "panel-c" },
    });
  });

  it("章节字段默认是 chapter_id，省略 index 表示追加", () => {
    expect(parsePlaceAnchor({ chapter_id: "chapter-1" })).toStrictEqual({
      ok: true,
      anchor: { chapter: "chapter-1" },
    });
  });

  it("章节可以带从 0 开始的 index", () => {
    expect(parsePlaceAnchor({ chapter_id: "chapter-1", index: 0 })).toStrictEqual({
      ok: true,
      anchor: { chapter: "chapter-1", index: 0 },
    });
  });

  it("章节字段名由参数指定", () => {
    expect(parsePlaceAnchor({ chapter: "chapter-9", index: 3 }, "chapter")).toStrictEqual({
      ok: true,
      anchor: { chapter: "chapter-9", index: 3 },
    });
  });

  it("一种都没有时返回文案", () => {
    expect(parsePlaceAnchor({ panel_id: "p", project_id: "j" })).toStrictEqual({
      ok: false,
      error: missing,
    });
    expect(parsePlaceAnchor(null)).toStrictEqual({ ok: false, error: missing });
    expect(parsePlaceAnchor(["before"])).toStrictEqual({ ok: false, error: missing });
  });

  it("多种锚点同时出现时返回文案", () => {
    expect(parsePlaceAnchor({ before: "a", after: "b" })).toStrictEqual({
      ok: false,
      error: multiple,
    });
    expect(parsePlaceAnchor({ before: "a", chapter_id: "c" })).toStrictEqual({
      ok: false,
      error: multiple,
    });
    expect(parsePlaceAnchor({ before: "a", after: "b", chapter_id: "c", index: 1 })).toStrictEqual({
      ok: false,
      error: multiple,
    });
  });

  it("index 不是非负整数时返回文案", () => {
    expect(parsePlaceAnchor({ chapter_id: "c", index: -1 }).ok).toBe(false);
    expect(parsePlaceAnchor({ chapter_id: "c", index: 1.5 })).toMatchObject({
      ok: false,
      error: "index 必须是大于等于 0 的整数",
    });
    expect(parsePlaceAnchor({ chapter_id: "c", index: "1" })).toMatchObject({ ok: false });
  });

  it("index 不能单独跟在 before 或 after 后面", () => {
    expect(parsePlaceAnchor({ before: "a", index: 0 })).toMatchObject({
      ok: false,
      error: "index 只能和章节一起使用",
    });
  });

  it("锚点不是非空字符串时返回文案", () => {
    expect(parsePlaceAnchor({ before: "" })).toMatchObject({ ok: false });
    expect(parsePlaceAnchor({ after: 1 })).toMatchObject({
      ok: false,
      error: "after 必须是非空字符串",
    });
    expect(parsePlaceAnchor({ chapter_id: "  " })).toMatchObject({
      ok: false,
      error: "chapter_id 必须是非空字符串",
    });
  });
});
