export type PlaceAnchor =
  | { before: string }
  | { after: string }
  | { chapter: string; index?: number };

export type ParsedPlaceAnchor =
  | { ok: true; anchor: PlaceAnchor }
  | { ok: false; error: string };

const MISSING_ANCHOR = "请指定 before、after 或章节中的恰好一种";
const MULTIPLE_ANCHORS = "只能指定一种锚点";
const INDEX_NEEDS_CHAPTER = "index 只能和章节一起使用";
const INDEX_INVALID = "index 必须是大于等于 0 的整数";

/**
 * 从请求体解析恰好一种放置锚点。失败时返回文案，不抛异常。
 * chapterField 是章节 id 的字段名，默认 chapter_id；结果里统一叫 chapter。
 * index 从 0 起，只能跟章节一起出现；省略表示追加到章尾。
 */
export function parsePlaceAnchor(body: unknown, chapterField = "chapter_id"): ParsedPlaceAnchor {
  const record = asRecord(body);
  if (!record) {
    return { ok: false, error: MISSING_ANCHOR };
  }

  const before = record.before;
  const after = record.after;
  const chapter = record[chapterField];
  const index = record.index;
  const chosen = Number(before !== undefined) + Number(after !== undefined) + Number(chapter !== undefined);

  if (chosen === 0) return { ok: false, error: MISSING_ANCHOR };
  if (chosen > 1) return { ok: false, error: MULTIPLE_ANCHORS };

  if (before !== undefined) {
    const id = nonEmptyString(before);
    if (!id) return { ok: false, error: "before 必须是非空字符串" };
    if (index !== undefined) return { ok: false, error: INDEX_NEEDS_CHAPTER };
    return { ok: true, anchor: { before: id } };
  }

  if (after !== undefined) {
    const id = nonEmptyString(after);
    if (!id) return { ok: false, error: "after 必须是非空字符串" };
    if (index !== undefined) return { ok: false, error: INDEX_NEEDS_CHAPTER };
    return { ok: true, anchor: { after: id } };
  }

  const chapterId = nonEmptyString(chapter);
  if (!chapterId) return { ok: false, error: `${chapterField} 必须是非空字符串` };
  if (index === undefined) return { ok: true, anchor: { chapter: chapterId } };
  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
    return { ok: false, error: INDEX_INVALID };
  }
  return { ok: true, anchor: { chapter: chapterId, index } };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
