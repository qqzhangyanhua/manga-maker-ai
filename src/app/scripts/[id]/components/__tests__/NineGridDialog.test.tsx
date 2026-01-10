/**
 * 九宫格对话框测试用例
 * 测试核心功能：状态管理、数据加载、用户交互
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NineGridDialog } from "../NineGridDialog";
import type { Chapter } from "../types";

// Mock toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

// ==================== 测试数据 ====================

const mockChapters: Chapter[] = [
  {
    id: "chapter-1",
    title: "第一章",
    chapter_order: 1,
    summary: "测试章节",
  },
  {
    id: "chapter-2",
    title: "第二章",
    chapter_order: 2,
    summary: null,
  },
];

const mockPanels = Array.from({ length: 12 }, (_, i) => ({
  id: `panel-${i + 1}`,
  panel_order: i + 1,
  description: `分镜描述 ${i + 1}`,
  visual_prompt: `视觉提示 ${i + 1}`,
  generated_image: `https://example.com/image-${i + 1}.jpg`,
}));

const mockComicStyles = [
  {
    id: "style-1",
    style_key: "anime",
    name_zh: "日式动漫",
    name_en: "Anime",
    prompt_prefix: "anime style",
    image_url: null,
  },
];

const mockCharacterAssets = [
  {
    id: "asset-1",
    name: "主角",
    base_image_url: "https://example.com/character.jpg",
    comic_style: mockComicStyles[0],
  },
];

// ==================== 测试套件 ====================

describe("NineGridDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    storyId: "story-1",
    projectId: "project-1",
    chapters: mockChapters,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 默认 mock 响应
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/panels")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ panels: mockPanels }),
        });
      }
      if (url.includes("/comic-styles")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockComicStyles }),
        });
      }
      if (url.includes("/character")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ characters: mockCharacterAssets }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== 渲染测试 ====================

  it("应该正确渲染对话框", () => {
    render(<NineGridDialog {...defaultProps} />);

    expect(screen.getByText("九宫格图片生成")).toBeInTheDocument();
    expect(screen.getByText(/选择 9 个分镜/)).toBeInTheDocument();
  });

  it("关闭时不应该渲染内容", () => {
    render(<NineGridDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("九宫格图片生成")).not.toBeInTheDocument();
  });

  // ==================== 数据加载测试 ====================

  it("打开时应该加载漫画风格和角色素材", async () => {
    render(<NineGridDialog {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/comic-styles?enabled=true");
      expect(global.fetch).toHaveBeenCalledWith("/api/character");
    });
  });

  it("选择章节后应该加载分镜数据", async () => {
    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/chapter/chapter-1/panels");
    });
  });

  // ==================== 分镜选择测试 ====================

  it("选择章节后应该自动选择前9个分镜", async () => {
    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 等待分镜加载并自动选择
    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });
  });

  it("应该能够手动切换分镜选择", async () => {
    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 等待加载
    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });

    // 点击第一个分镜取消选择
    const firstPanel = await screen.findByText("分镜 1");
    await user.click(firstPanel.closest("div")!);

    // 验证选择数量变化
    await waitFor(() => {
      expect(screen.getByText("(已选 8/9)")).toBeInTheDocument();
    });
  });

  it("点击'选择前9个'按钮应该选择前9个分镜", async () => {
    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 等待加载
    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });

    // 清空选择
    const clearButton = screen.getByRole("button", { name: /清空选择/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText("(已选 0/9)")).toBeInTheDocument();
    });

    // 点击选择前9个
    const selectButton = screen.getByRole("button", { name: /选择前9个/i });
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });
  });

  it("点击'清空选择'按钮应该清空所有选择", async () => {
    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 等待自动选择
    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });

    // 清空选择
    const clearButton = screen.getByRole("button", { name: /清空选择/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText("(已选 0/9)")).toBeInTheDocument();
    });
  });

  it("选择不足9个分镜时提交按钮应该禁用", async () => {
    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 等待加载
    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });

    // 取消一个选择
    const firstPanel = await screen.findByText("分镜 1");
    await user.click(firstPanel.closest("div")!);

    // 验证提交按钮禁用
    const submitButton = screen.getByRole("button", { name: /生成九宫格图片/i });
    expect(submitButton).toBeDisabled();
  });

  // ==================== 表单提交测试 ====================

  it("选择9个分镜后应该能够提交表单", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("generate-nine-grid-image")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      // 其他请求使用默认 mock
      return (global.fetch as ReturnType<typeof vi.fn>).getMockImplementation()?.(url);
    });

    render(<NineGridDialog {...defaultProps} onSuccess={onSuccess} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 等待自动选择
    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });

    // 提交表单
    const submitButton = screen.getByRole("button", { name: /生成九宫格图片/i });
    await user.click(submitButton);

    // 验证 API 调用
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/chapter/chapter-1/generate-nine-grid-image",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });

    // 验证成功回调
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("项目ID不存在时应该显示错误", async () => {
    const user = userEvent.setup();
    const { useToast } = await import("@/hooks/use-toast");
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });

    render(<NineGridDialog {...defaultProps} projectId={null} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 等待自动选择
    await waitFor(() => {
      expect(screen.getByText("(已选 9/9)")).toBeInTheDocument();
    });

    // 提交表单
    const submitButton = screen.getByRole("button", { name: /生成九宫格图片/i });
    await user.click(submitButton);

    // 验证错误提示
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "错误",
          description: "项目 ID 不存在",
        })
      );
    });
  });

  // ==================== 边界条件测试 ====================

  it("章节没有分镜时应该显示提示", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/panels")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ panels: [] }),
        });
      }
      return (global.fetch as ReturnType<typeof vi.fn>).getMockImplementation()?.(url);
    });

    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 验证提示信息
    await waitFor(() => {
      expect(screen.getByText("该章节暂无分镜，请先生成分镜")).toBeInTheDocument();
    });
  });

  it("章节分镜少于9个时应该显示提示", async () => {
    const { useToast } = await import("@/hooks/use-toast");
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/panels")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ panels: mockPanels.slice(0, 5) }),
        });
      }
      return (global.fetch as ReturnType<typeof vi.fn>).getMockImplementation()?.(url);
    });

    const user = userEvent.setup();
    render(<NineGridDialog {...defaultProps} />);

    // 选择章节
    const chapterSelect = screen.getByRole("combobox", { name: /选择章节/i });
    await user.click(chapterSelect);
    const chapterOption = await screen.findByText(/第一章/);
    await user.click(chapterOption);

    // 验证 toast 提示
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("少于 9 个"),
        })
      );
    });
  });
});
