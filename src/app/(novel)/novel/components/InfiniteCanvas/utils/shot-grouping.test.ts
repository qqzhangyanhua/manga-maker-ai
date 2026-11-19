import { describe, it, expect } from "vitest";
import { groupShotsIntoNineGrids, generatePlaceholders } from "./shot-grouping";
import type { CanvasShotJson } from "@/lib/canvas/types";

describe("shot-grouping", () => {
  describe("groupShotsIntoNineGrids", () => {
    it("应该正确分组完整的9个镜头", () => {
      const shots = Array.from({ length: 9 }, (_, i) => ({
        id: `shot-${i + 1}`,
        panel_order: i + 1,
      })) as CanvasShotJson[];

      const groups = groupShotsIntoNineGrids(shots);

      expect(groups).toHaveLength(1);
      expect(groups[0].isComplete).toBe(true);
      expect(groups[0].placeholderCount).toBe(0);
      expect(groups[0].startOrder).toBe(1);
      expect(groups[0].endOrder).toBe(9);
    });

    it("应该正确处理30个镜头（4组）", () => {
      const shots = Array.from({ length: 30 }, (_, i) => ({
        id: `shot-${i + 1}`,
        panel_order: i + 1,
      })) as CanvasShotJson[];

      const groups = groupShotsIntoNineGrids(shots);

      expect(groups).toHaveLength(4);
      expect(groups[0].shots).toHaveLength(9);
      expect(groups[3].shots).toHaveLength(3);
      expect(groups[3].placeholderCount).toBe(6);
      expect(groups[3].isComplete).toBe(false);
    });

    it("应该处理空数组", () => {
      const groups = groupShotsIntoNineGrids([]);
      expect(groups).toHaveLength(0);
    });
  });

  describe("generatePlaceholders", () => {
    it("应该生成正确的占位符序号", () => {
      const placeholders = generatePlaceholders(3, 28);
      expect(placeholders).toEqual([28, 29, 30]);
    });
  });
});
