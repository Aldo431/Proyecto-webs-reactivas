import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedSearch } from "./useDebouncedSearch.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedSearch", () => {
  it("starts with the committed text and does not commit by itself", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDebouncedSearch("taza", onCommit));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe("taza");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("shows typing at once and commits once after the delay", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDebouncedSearch("", onCommit));

    act(() => result.current[1]("t"));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => result.current[1]("ta"));
    act(() => result.current[1]("taza"));
    expect(result.current[0]).toBe("taza");
    expect(onCommit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("taza");
  });

  it("commits the trimmed text and skips a no-op change", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDebouncedSearch("taza", onCommit));

    act(() => result.current[1]("  taza  "));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onCommit).not.toHaveBeenCalled();

    act(() => result.current[1]("  polera "));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("polera");
  });

  it("reflects a committed text that changes from outside", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const { result, rerender } = renderHook(
      ({ committed }: { committed: string }) =>
        useDebouncedSearch(committed, onCommit),
      { initialProps: { committed: "taza" } },
    );

    rerender({ committed: "" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current[0]).toBe("");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("calls the latest onCommit", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onCommit }: { onCommit: (text: string) => void }) =>
        useDebouncedSearch("", onCommit),
      { initialProps: { onCommit: first } },
    );

    act(() => result.current[1]("a"));
    rerender({ onCommit: second });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith("a");
  });
});
