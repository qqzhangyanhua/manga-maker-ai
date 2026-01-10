/**
 * 九宫格生成器单元测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateNineGridPanels, formatNineGridPanelsAsText } from "../nine-grid-generator";
import type { NineGridPanel } from "../nine-grid-generator";

// Mock LLM provider
vi.mock("../llm-provider", () => ({
  callChatCompletionByType: vi.fn(),
}));

import { callChatCompletionByType } from "../llm-provider";

describe("nine-grid-generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateNineGridPanels", () => {
    it("应该生成恰好 9 个分镜", async () => {
      // Mock AI 返回
      const mockPanels: NineGridPanel[] = Array.from({ length: 9 }, (_, i) => ({
        panel_order: i + 1,
        description: `镜头 ${i + 1} 的描述`,
        visual_prompt: `Visual prompt for panel ${i + 1}`,
        camera_angle: "平视",
        shot_size: "中景",
        panel_type: "action",
        importance: "medium",
      }));

      vi.mocked(callChatCompletionByType).mockResolvedValue({
        content: JSON.stringify({ panels: mockPanels }),
      });

      const result = await generateNineGridPanels({
        plotSummary: "测试剧情概述",
      });

      expect(result).toHaveLength(9);
      expect(result[0].panel_order).toBe(1);
      expect(result[8].panel_order).toBe(9);
    });

    it("应该正确处理包含主题和参考图的请求", async () => {
      const mockPanels: NineGridPanel[] = Array.from({ length: 9 }, (_, i) => ({
        panel_order: i + 1,
        description: `镜头 ${i + 1}`,
        visual_prompt: `Prompt ${i + 1}`,
        camera_angle: "正视",
        shot_size: "近景",
        panel_type: "dialogue",
        importance: "high",
      }));

      vi.mocked(callChatCompletionByType).mockResolvedValue({
        content: JSON.stringify({ panels: mockPanels }),
      });

      const result = await generateNineGridPanels({
        plotSummary: "剧情概述",
        theme: "紧张对峙",
        referenceImage: "https://example.com/ref.jpg",
        storyTitle: "测试故事",
        genre: "动作",
      });

      expect(result).toHaveLength(9);
      expect(callChatCompletionByType).toHaveBeenCalledWith(
        expect.objectContaining({
          providerType: "script_analyzer",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("紧张对峙"),
            }),
          ]),
        })
      );
    });

    it("应该在分镜数量不足时抛出错误", async () => {
      const mockPanels: NineGridPanel[] = Array.from({ length: 5 }, (_, i) => ({
        panel_order: i + 1,
        description: `镜头 ${i + 1}`,
        visual_prompt: `Prompt ${i + 1}`,
        camera_angle: "平视",
        shot_size: "中景",
        panel_type: "action",
        importance: "medium",
      }));

      vi.mocked(callChatCompletionByType).mockResolvedValue({
        content: JSON.stringify({ panels: mockPanels }),
      });

      await expect(
        generateNineGridPanels({
          plotSummary: "测试",
        })
      ).rejects.toThrow("生成的镜头数量不足");
    });

    it("应该在分镜数量超过 9 时只取前 9 个", async () => {
      const mockPanels: NineGridPanel[] = Array.from({ length: 12 }, (_, i) => ({
        panel_order: i + 1,
        description: `镜头 ${i + 1}`,
        visual_prompt: `Prompt ${i + 1}`,
        camera_angle: "平视",
        shot_size: "中景",
        panel_type: "action",
        importance: "medium",
      }));

      vi.mocked(callChatCompletionByType).mockResolvedValue({
        content: JSON.stringify({ panels: mockPanels }),
      });

      const result = await generateNineGridPanels({
        plotSummary: "测试",
      });

      expect(result).toHaveLength(9);
      expect(result[8].panel_order).toBe(9);
    });

    it("应该正确处理 JSON 解析错误", async () => {
      vi.mocked(callChatCompletionByType).mockResolvedValue({
        content: "这不是有效的 JSON",
      });

      await expect(
        generateNineGridPanels({
          plotSummary: "测试",
        })
      ).rejects.toThrow("无法解析为 JSON");
    });

    it("应该正确处理缺少 panels 数组的响应", async () => {
      vi.mocked(callChatCompletionByType).mockResolvedValue({
        content: JSON.stringify({ error: "没有 panels" }),
      });

      await expect(
        generateNineGridPanels({
          plotSummary: "测试",
        })
      ).rejects.toThrow("缺少 panels 数组");
    });

    it("应该移除 markdown 代码块标记", async () => {
      const mockPanels: NineGridPanel[] = Array.from({ length: 9 }, (_, i) => ({
        panel_order: i + 1,
        description: `镜头 ${i + 1}`,
        visual_prompt: `Prompt ${i + 1}`,
        camera_angle: "平视",
        shot_size: "中景",
        panel_type: "action",
        importance: "medium",
      }));

      vi.mocked(callChatCompletionByType).mockResolvedValue({
        content: "```json\n" + JSON.stringify({ panels: mockPanels }) + "\n```",
      });

      const result = await generateNineGridPanels({
        plotSummary: "测试",
      });

      expect(result).toHaveLength(9);
    });
  });

  describe("formatNineGridPanelsAsText", () => {
    it("应该正确格式化分镜为文本", () => {
      const panels: NineGridPanel[] = [
        {
          panel_order: 1,
          description: "第一个镜头的描述",
          visual_prompt: "Visual prompt 1",
          camera_angle: "平视",
          shot_size: "中景",
          panel_type: "action",
          importance: "high",
        },
        {
          panel_order: 2,
          description: "第二个镜头的描述",
          visual_prompt: "Visual prompt 2",
          camera_angle: "俯视",
          shot_size: "远景",
          panel_type: "dialogue",
          importance: "medium",
        },
      ];

      const result = formatNineGridPanelsAsText(panels);

      expect(result).toContain("镜头01：第一个镜头的描述");
      expect(result).toContain("镜头02：第二个镜头的描述");
      expect(result).toMatch(/镜头01：.*\n\n镜头02：/);
    });

    it("应该正确处理空数组", () => {
      const result = formatNineGridPanelsAsText([]);
      expect(result).toBe("");
    });

    it("应该正确格式化 9 个镜头", () => {
      const panels: NineGridPanel[] = Array.from({ length: 9 }, (_, i) => ({
        panel_order: i + 1,
        description: `镜头 ${i + 1} 的描述`,
        visual_prompt: `Prompt ${i + 1}`,
        camera_angle: "平视",
        shot_size: "中景",
        panel_type: "action",
        importance: "medium",
      }));

      const result = formatNineGridPanelsAsText(panels);

      expect(result).toContain("镜头01：");
      expect(result).toContain("镜头09：");
      expect(result.split("\n\n")).toHaveLength(9);
    });
  });
});
