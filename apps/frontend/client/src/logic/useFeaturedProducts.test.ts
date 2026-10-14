import { act, renderHook, waitFor } from "@testing-library/react";
import type { Product } from "@tiendadcc/utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeProduct } from "./productFixtures.ts";
import type { FeaturedProductsSource } from "./productRepository.ts";
import { useFeaturedProducts } from "./useFeaturedProducts.ts";

interface Deferred {
  promise: Promise<Product[]>;
  resolve: (products: Product[]) => void;
  reject: (error: Error) => void;
}

function deferred(): Deferred {
  let resolve: (products: Product[]) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<Product[]>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const featured = [makeProduct({ id: "taza-dcc" })];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useFeaturedProducts", () => {
  it("goes from loading to success", async () => {
    const pending = deferred();
    const source: FeaturedProductsSource = () => pending.promise;
    const { result } = renderHook(() => useFeaturedProducts(source));

    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {
      pending.resolve(featured);
    });
    expect(result.current.state).toEqual({
      status: "success",
      products: featured,
    });
  });

  it("goes from loading to error when the source rejects", async () => {
    const pending = deferred();
    const source: FeaturedProductsSource = () => pending.promise;
    const { result } = renderHook(() => useFeaturedProducts(source));

    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {
      pending.reject(new Error("falla"));
    });
    expect(result.current.state).toEqual({ status: "error" });
  });

  it("retries: back to loading, then success", async () => {
    const attempts = [deferred(), deferred()];
    let call = 0;
    const source: FeaturedProductsSource = () => {
      const current = attempts[call];
      call += 1;
      if (current === undefined) throw new Error("unexpected call");
      return current.promise;
    };
    const { result } = renderHook(() => useFeaturedProducts(source));

    await act(async () => {
      attempts[0]?.reject(new Error("falla"));
    });
    expect(result.current.state).toEqual({ status: "error" });

    act(() => {
      result.current.retry();
    });
    expect(result.current.state).toEqual({ status: "loading" });

    await act(async () => {
      attempts[1]?.resolve(featured);
    });
    expect(result.current.state).toEqual({
      status: "success",
      products: featured,
    });
    expect(call).toBe(2);
  });

  it("ignores retry while a load is in flight", async () => {
    const pending = deferred();
    const source = vi.fn<FeaturedProductsSource>(() => pending.promise);
    const { result } = renderHook(() => useFeaturedProducts(source));

    act(() => {
      result.current.retry();
      result.current.retry();
    });
    expect(source).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(featured);
    });
    expect(source).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe("success");
  });

  it("does not update state after unmounting", async () => {
    const pending = deferred();
    const source: FeaturedProductsSource = () => pending.promise;
    const consoleError = vi.spyOn(console, "error");
    const { result, unmount } = renderHook(() => useFeaturedProducts(source));

    unmount();
    await act(async () => {
      pending.resolve(featured);
    });

    expect(result.current.state).toEqual({ status: "loading" });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("discards a late answer from a replaced source", async () => {
    const first = deferred();
    const second = deferred();
    const firstSource: FeaturedProductsSource = () => first.promise;
    const secondSource: FeaturedProductsSource = () => second.promise;
    const { result, rerender } = renderHook(
      ({ source }: { source: FeaturedProductsSource }) =>
        useFeaturedProducts(source),
      { initialProps: { source: firstSource } },
    );

    rerender({ source: secondSource });
    const latest = [makeProduct({ id: "polera-dcc" })];
    await act(async () => {
      second.resolve(latest);
    });
    await act(async () => {
      first.resolve(featured);
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "success",
        products: latest,
      });
    });
  });
});
