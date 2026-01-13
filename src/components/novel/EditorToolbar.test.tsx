/**
 * EditorToolbar 测试用例
 * 验证修复后的工具栏功能
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';

// Mock Editor instance
const createMockEditor = (hasSelection = false) => ({
  state: {
    selection: {
      from: hasSelection ? 0 : 5,
      to: hasSelection ? 10 : 5,
    },
  },
  view: {
    coordsAtPos: vi.fn((pos: number) => ({
      left: 100 + pos * 10,
      right: 120 + pos * 10,
      top: 200,
      bottom: 220,
    })),
  },
  isActive: vi.fn(() => false),
  can: vi.fn(() => ({ toggleUnderline: () => true })),
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      toggleBold: vi.fn(() => ({ run: vi.fn() })),
      toggleItalic: vi.fn(() => ({ run: vi.fn() })),
      toggleUnderline: vi.fn(() => ({ run: vi.fn() })),
      toggleStrike: vi.fn(() => ({ run: vi.fn() })),
      toggleHeading: vi.fn(() => ({ run: vi.fn() })),
      toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
      toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
    })),
  })),
  on: vi.fn(),
  off: vi.fn(),
}) as unknown as Editor;

// Mock window properties
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  pageXOffset: 0,
  pageYOffset: 0,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe('EditorToolbar', () => {
  beforeEach(() => {
    // Mock window properties
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    Object.defineProperty(window, 'pageXOffset', { value: 0, writable: true });
    Object.defineProperty(window, 'pageYOffset', { value: 0, writable: true });

    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no text is selected', () => {
    const editor = createMockEditor(false);
    const { container } = render(<EditorToolbar editor={editor} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render with proper positioning when text is selected', () => {
    const editor = createMockEditor(true);
    const { container } = render(<EditorToolbar editor={editor} />);

    // Should render the toolbar
    expect(container.firstChild).not.toBeNull();

    // Should have proper ARIA attributes
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).toBeTruthy();
    expect(toolbar).toHaveAttribute('aria-label', '文本格式化工具栏');
  });

  it('should accept custom configuration props', () => {
    const editor = createMockEditor(true);
    const customProps = {
      offset: { x: 10, y: -30 },
      zIndex: 100,
      debounceMs: 200,
    };

    const { container } = render(<EditorToolbar editor={editor} {...customProps} />);

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar?.style.zIndex).toBe('100');
  });

  it('should handle viewport boundary adjustments', () => {
    // Mock small viewport
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 300, writable: true });

    const editor = createMockEditor(true);
    const { container } = render(<EditorToolbar editor={editor} />);

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toBeTruthy();

    // Position should be adjusted to stay within viewport
    const left = parseInt(toolbar.style.left);
    const top = parseInt(toolbar.style.top);

    expect(left).toBeGreaterThanOrEqual(10); // Should have minimum margin
    expect(top).toBeGreaterThanOrEqual(10);
  });

  it('should register and cleanup event listeners properly', () => {
    const editor = createMockEditor(true);
    const { unmount } = render(<EditorToolbar editor={editor} />);

    // Should register editor events
    expect(editor.on).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
    expect(editor.on).toHaveBeenCalledWith('transaction', expect.any(Function));

    // Should register window events
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), true);

    // Should cleanup on unmount
    unmount();
    expect(editor.off).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
    expect(editor.off).toHaveBeenCalledWith('transaction', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), true);
  });

  it('should handle errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create editor that throws error on coordsAtPos
    const faultyEditor = {
      ...createMockEditor(true),
      view: {
        coordsAtPos: vi.fn(() => {
          throw new Error('Test error');
        }),
      },
    } as unknown as Editor;

    const { container } = render(<EditorToolbar editor={faultyEditor} />);

    // Should still render (with fallback positioning)
    expect(container.firstChild).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalledWith('Toolbar positioning failed:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should include all formatting buttons', () => {
    const editor = createMockEditor(true);
    render(<EditorToolbar editor={editor} />);

    // Check for all expected buttons
    expect(screen.getByTitle('加粗 (Ctrl+B)')).toBeTruthy();
    expect(screen.getByTitle('斜体 (Ctrl+I)')).toBeTruthy();
    expect(screen.getByTitle('下划线 (Ctrl+U)')).toBeTruthy();
    expect(screen.getByTitle('删除线')).toBeTruthy();
    expect(screen.getByTitle('一级标题')).toBeTruthy();
    expect(screen.getByTitle('二级标题')).toBeTruthy();
    expect(screen.getByTitle('三级标题')).toBeTruthy();
    expect(screen.getByTitle('无序列表')).toBeTruthy();
    expect(screen.getByTitle('有序列表')).toBeTruthy();
  });
});