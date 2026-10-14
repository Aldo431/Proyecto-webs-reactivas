import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeProduct } from "./productFixtures.ts";
import { useCatalogPage } from "./useCatalogPage.ts";
import { CATALOG_DEFAULTS } from "./catalogQuery.ts";
import { fetchCatalogPage } from "./productApi.ts";

vi.mock("./productApi.ts", () => ({ fetchCatalogPage: vi.fn() }));

const fetchMock = vi.mocked(fetchCatalogPage);

const pageOf = (names: string[]) => ({
  ok: true as const,
  page: {
    products: names.map((name) => makeProduct({ name })),
    total: names.length,
    pagina: 1,
    porPagina: 9 as const,
    totalPaginas: 1,
  },
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useCatalogPage", () => {
  it("loads the first page immediately", async () => {
    fetchMock.mockResolvedValue(pageOf(["Taza DCC"]));
    const { result } = renderHook(() =>
      useCatalogPage({ ...CATALOG_DEFAULTS }),
    );

    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {});
    expect(result.current.state).toEqual({
      status: "success",
      products: pageOf(["Taza DCC"]).page.products,
      total: 1,
      pagina: 1,
      totalPaginas: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("debounces search text changes into a single request", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(pageOf([]));
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useCatalogPage({ ...CATALOG_DEFAULTS, q }),
      { initialProps: { q: "" } },
    );
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ q: "ta" });
    rerender({ q: "taza" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toMatchObject({ q: "taza" });
    expect(result.current.state.status).toBe("success");
  });

  it("discards late answers from older requests", async () => {
    vi.useFakeTimers();
    let resolveFirst!: (value: ReturnType<typeof pageOf>) => void;
    const first = new Promise<ReturnType<typeof pageOf>>((resolve) => {
      resolveFirst = resolve;
    });
    fetchMock
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(pageOf(["Polera DCC"]));
    const { result, rerender } = renderHook(
      ({ pagina }: { pagina: number }) =>
        useCatalogPage({ ...CATALOG_DEFAULTS, pagina }),
      { initialProps: { pagina: 1 } },
    );

    rerender({ pagina: 2 });
    await act(async () => {
      resolveFirst(pageOf(["Taza DCC"]));
    });
    await act(async () => {});

    expect(result.current.state).toMatchObject({
      status: "success",
      total: 1,
    });
    if (result.current.state.status === "success") {
      expect(result.current.state.products.map((p) => p.name)).toEqual([
        "Polera DCC",
      ]);
    }
  });

  it("goes to error and retries", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false as const, message: "Falla." })
      .mockResolvedValueOnce(pageOf(["Taza DCC"]));
    const { result } = renderHook(() =>
      useCatalogPage({ ...CATALOG_DEFAULTS }),
    );

    await act(async () => {});
    expect(result.current.state).toEqual({ status: "error" });

    act(() => {
      result.current.retry();
    });
    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {});
    expect(result.current.state.status).toBe("success");
  });
});
