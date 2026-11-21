import { describe, expect, it } from "vitest";

import { anchorForMove } from "./drag-anchor";

const ids = ["a", "b", "c", "d"];

describe("anchorForMove", () => {
  it("往下拖到 2 时落到 c 之后", () => {
    expect(anchorForMove(0, 2, ids)).toEqual({ after: "c" });
  });

  it("往上拖到 1 时落到 b 之前", () => {
    expect(anchorForMove(3, 1, ids)).toEqual({ before: "b" });
  });

  it("下标相同或越界返回 null", () => {
    expect(anchorForMove(1, 1, ids)).toBeNull();
    expect(anchorForMove(-1, 0, ids)).toBeNull();
    expect(anchorForMove(0, 4, ids)).toBeNull();
    expect(anchorForMove(1.5, 2, ids)).toBeNull();
  });
});
