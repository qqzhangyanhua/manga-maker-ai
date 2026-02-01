import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInlineEdit } from "./useInlineEdit";

describe("useInlineEdit", () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with isEditing false", () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test content",
        onSave: mockOnSave,
      })
    );

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe("test content");
  });

  it("should enter edit mode when startEditing is called", () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test content",
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.startEditing();
    });

    expect(result.current.isEditing).toBe(true);
  });

  it("should cancel editing and restore original value on cancelEditing", () => {
    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "original",
        onSave: mockOnSave,
      })
    );

    act(() => {
      result.current.startEditing();
      result.current.setValue("modified");
    });

    expect(result.current.value).toBe("modified");

    act(() => {
      result.current.cancelEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe("original");
  });

  it("should debounce save calls", async () => {
    mockOnSave.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test",
        onSave: mockOnSave,
        debounceMs: 300,
      })
    );

    act(() => {
      result.current.startEditing();
      result.current.setValue("new value");
    });

    // Save not called immediately
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fast-forward debounce timer
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnSave).toHaveBeenCalledWith("new value");
  });

  it("should set saveStatus to saving during save", async () => {
    let resolvePromise: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnSave.mockReturnValue(savePromise);

    const { result } = renderHook(() =>
      useInlineEdit({
        initialValue: "test",
        onSave: mockOnSave,
        debounceMs: 0,
      })
    );

    act(() => {
      result.current.startEditing();
      result.current.setValue("new value");
    });

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.saveStatus).toBe("saving");

    await act(async () => {
      resolvePromise!();
    });

    expect(result.current.saveStatus).toBe("saved");
  });
});
