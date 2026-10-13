import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeProduct } from "./productFixtures.ts";
import type { ProductResult } from "./productApi.ts";
import { useProduct } from "./useProduct.ts";

const taza = makeProduct({ id: "taza-dcc", name: "Taza DCC" });
const polera = makeProduct({ id: "polera-dcc", name: "Polera DCC" });

function loaderFor(
  results: Record<string, ProductResult>,
): (id: string) => Promise<ProductResult> {
  return (id) =>
    Promise.resolve(
      results[id] ?? { ok: false, message: "Producto no encontrado.", notFound: true },
    );
}

describe("useProduct", () => {
  it("goes from loading to success", async () => {
    const load = loaderFor({ "taza-dcc": { ok: true, product: taza } });
    const { result } = renderHook(() => useProduct("taza-dcc", load));

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "success", product: taza });
    });
  });

  it("reports notFound for a 404 failure", async () => {
    const load = loaderFor({});
    const { result } = renderHook(() => useProduct("nada", load));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "notFound" });
    });
  });

  it("reports error with the message for any other failure", async () => {
    const load = loaderFor({
      "taza-dcc": { ok: false, message: "No se pudo conectar." },
    });
    const { result } = renderHook(() => useProduct("taza-dcc", load));

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "error",
        message: "No se pudo conectar.",
      });
    });
  });

  it("retries after an error", async () => {
    const load = vi
      .fn<(id: string) => Promise<ProductResult>>()
      .mockResolvedValueOnce({ ok: false, message: "Falla" })
      .mockResolvedValueOnce({ ok: true, product: taza });
    const { result } = renderHook(() => useProduct("taza-dcc", load));

    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "success", product: taza });
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never shows the previous product under a new id", async () => {
    const load = loaderFor({
      "taza-dcc": { ok: true, product: taza },
      "polera-dcc": { ok: true, product: polera },
    });
    const { result, rerender } = renderHook(
      ({ id }) => useProduct(id, load),
      { initialProps: { id: "taza-dcc" } },
    );
    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });

    rerender({ id: "polera-dcc" });

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "success",
        product: polera,
      });
    });
  });

  it("ignores a late answer from a previous id", async () => {
    let resolveFirst: (result: ProductResult) => void = () => {};
    const load = vi.fn((id: string): Promise<ProductResult> => {
      if (id === "taza-dcc") {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve({ ok: true, product: polera });
    });
    const { result, rerender } = renderHook(
      ({ id }) => useProduct(id, load),
      { initialProps: { id: "taza-dcc" } },
    );

    rerender({ id: "polera-dcc" });
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "success", product: polera });
    });
    await act(async () => {
      resolveFirst({ ok: true, product: taza });
    });

    expect(result.current.state).toEqual({ status: "success", product: polera });
  });
});
