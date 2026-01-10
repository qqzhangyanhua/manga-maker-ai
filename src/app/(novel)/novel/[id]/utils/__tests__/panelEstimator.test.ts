/**
 * 镜头数量预估工具函数测试
 */

import { describe, it, expect } from "vitest";
import {
  calculatePanelCountClient,
  estimatePanelCountFromOutline,
  batchEstimatePanelCountFromOutlines,
  getEstimationSummary,
} from "../panelEstimator";
import type { ChapterOutline } from "../../types";

describe("panelEstimator", () => {
  describe("calculatePanelCountClient", () => {
    it("应该根据字数和类型正确计算镜头数", () => {
      // 悬疑类型，5000字，标准密度（220字/镜）
      const result = calculatePanelCountClient(5000, "suspense", "standard");
      expect(result).toBeCloseTo(23, 0); // 5000 / 220 ≈ 23
    });

    it("应该对爱情类型使用更低的镜头密度", () => {
      // 爱情类型，5000字，标准密度（280字/镜）
      const suspense = calculatePanelCountClient(5000, "suspense", "standard");
      const romance = calculatePanelCountClient(5000, "romance", "standard");

      expect(romance).toBeLessThan(suspense); // 爱情镜头数应该更少
    });

    it("应该对冒险类型使用更高的镜头密度", () => {
      // 冒险类型，5000字，标准密度（200字/镜）
      const romance = calculatePanelCountClient(5000, "romance", "standard");
      const adventure = calculatePanelCountClient(5000, "adventure", "standard");

      expect(adventure).toBeGreaterThan(romance); // 冒险镜头数应该更多
    });

    it("应该正确应用密度模式调整", () => {
      const wordCount = 5000;
      const genre = "suspense";

      const sparse = calculatePanelCountClient(wordCount, genre, "sparse");
      const standard = calculatePanelCountClient(wordCount, genre, "standard");
      const dense = calculatePanelCountClient(wordCount, genre, "dense");

      // 稀疏 < 标准 < 密集
      expect(sparse).toBeLessThan(standard);
      expect(standard).toBeLessThan(dense);
    });

    it("应该遵守最小镜头数约束（5个）", () => {
      const result = calculatePanelCountClient(100, "romance", "standard");
      expect(result).toBeGreaterThanOrEqual(5);
    });

    it("应该遵守最大镜头数约束（50个）", () => {
      const result = calculatePanelCountClient(50000, "adventure", "dense");
      expect(result).toBeLessThanOrEqual(50);
    });

    it("应该对未知类型使用默认密度", () => {
      const result = calculatePanelCountClient(5000, "unknown_genre", "standard");
      expect(result).toBeCloseTo(20, 0); // 5000 / 250 = 20
    });
  });

  describe("estimatePanelCountFromOutline", () => {
    it("应该从章节大纲对象计算预估", () => {
      const testContent = "这是测试内容。".repeat(700); // 确保约5000字
      const chapter: ChapterOutline = {
        _tempId: "test-1",
        chapterNumber: 1,
        title: "第一章",
        outline: testContent,
        keyEvents: [],
        characters: [],
        plotLines: [],
        isKeyChapter: false,
      };

      const result = estimatePanelCountFromOutline(chapter, "suspense", "standard");

      expect(result.estimatedCount).toBeGreaterThan(0);
      expect(result.wordCount).toBeGreaterThan(4000); // 放宽条件
      expect(result.genre).toBe("suspense");
      expect(result.densityMode).toBe("standard");
    });

    it("应该计算正确的镜头范围（±30%）", () => {
      const chapter: ChapterOutline = {
        _tempId: "test-2",
        chapterNumber: 2,
        title: "第二章",
        outline: "测试内容".repeat(500), // 约2000字
        keyEvents: [],
        characters: [],
        plotLines: [],
        isKeyChapter: false,
      };

      const result = estimatePanelCountFromOutline(chapter, "scifi", "standard");

      // 验证范围合理性（考虑最小约束）
      expect(result.minCount).toBeLessThanOrEqual(result.estimatedCount);
      expect(result.maxCount).toBeGreaterThanOrEqual(result.estimatedCount);

      // 如果不受最小值约束，验证30%规则
      if (result.estimatedCount > 7) {
        expect(result.minCount).toBeCloseTo(result.estimatedCount * 0.7, 0);
        expect(result.maxCount).toBeCloseTo(result.estimatedCount * 1.3, 0);
      }
    });

    it("应该计算正确的 credits 消耗", () => {
      const chapter: ChapterOutline = {
        _tempId: "test-3",
        chapterNumber: 3,
        title: "第三章",
        outline: "测试".repeat(1000), // 约2000字
        keyEvents: [],
        characters: [],
        plotLines: [],
        isKeyChapter: false,
      };

      const result = estimatePanelCountFromOutline(chapter, "fantasy", "standard", 5);

      // credits = 镜头数 * 每镜头成本
      expect(result.estimatedCredits).toBe(result.estimatedCount * 5);
    });

    it("应该为过短章节生成警告", () => {
      const chapter: ChapterOutline = {
        _tempId: "test-4",
        chapterNumber: 4,
        title: "第四章",
        outline: "短章节内容", // 远少于1500字
        keyEvents: [],
        characters: [],
        plotLines: [],
        isKeyChapter: false,
      };

      const result = estimatePanelCountFromOutline(chapter, "daily", "standard");

      // 检查警告数组中是否包含过短警告
      const hasShortWarning = result.warnings.some((w) =>
        w.includes("章节过短")
      );
      expect(hasShortWarning).toBe(true);
    });

    it("应该为过长章节生成警告", () => {
      const longContent = "这是一个非常长的章节内容。".repeat(1000); // 确保超过12000字
      const chapter: ChapterOutline = {
        _tempId: "test-5",
        chapterNumber: 5,
        title: "第五章",
        outline: longContent,
        keyEvents: [],
        characters: [],
        plotLines: [],
        isKeyChapter: false,
      };

      const result = estimatePanelCountFromOutline(chapter, "adventure", "standard");

      // 检查警告数组中是否包含过长警告
      const hasLongWarning = result.warnings.some((w) =>
        w.includes("章节过长")
      );
      expect(hasLongWarning).toBe(true);
    });
  });

  describe("batchEstimatePanelCountFromOutlines", () => {
    it("应该批量预估多个章节", () => {
      const chapters: ChapterOutline[] = [
        {
          _tempId: "batch-1",
          chapterNumber: 1,
          title: "第一章",
          outline: "内容".repeat(1000), // 约2000字
          keyEvents: [],
          characters: [],
          plotLines: [],
          isKeyChapter: false,
        },
        {
          _tempId: "batch-2",
          chapterNumber: 2,
          title: "第二章",
          outline: "内容".repeat(1500), // 约3000字
          keyEvents: [],
          characters: [],
          plotLines: [],
          isKeyChapter: false,
        },
      ];

      const results = batchEstimatePanelCountFromOutlines(chapters, "scifi", "standard");

      expect(results).toHaveLength(2);
      expect(results[0].estimatedCount).toBeGreaterThan(0);
      expect(results[1].estimatedCount).toBeGreaterThan(results[0].estimatedCount); // 第二章更长
    });
  });

  describe("getEstimationSummary", () => {
    it("应该正确计算批量预估摘要", () => {
      const estimations = [
        {
          estimatedCount: 20,
          minCount: 14,
          maxCount: 26,
          wordCount: 5000,
          baseDensity: 250,
          genre: "suspense",
          estimatedCredits: 40,
          densityMode: "standard" as const,
          warnings: [],
        },
        {
          estimatedCount: 15,
          minCount: 11,
          maxCount: 20,
          wordCount: 3750,
          baseDensity: 250,
          genre: "suspense",
          estimatedCredits: 30,
          densityMode: "standard" as const,
          warnings: [],
        },
      ];

      const summary = getEstimationSummary(estimations);

      expect(summary.totalPanels).toBe(35);
      expect(summary.totalCredits).toBe(70);
      expect(summary.totalWordCount).toBe(8750);
      expect(summary.averagePanelsPerChapter).toBe(18); // (20 + 15) / 2 ≈ 18
    });

    it("应该处理空数组", () => {
      const summary = getEstimationSummary([]);

      expect(summary.totalPanels).toBe(0);
      expect(summary.totalCredits).toBe(0);
      expect(summary.totalWordCount).toBe(0);
      expect(summary.averagePanelsPerChapter).toBe(0);
    });
  });
});
