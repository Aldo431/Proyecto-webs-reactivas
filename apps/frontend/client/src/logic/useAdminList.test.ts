import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminResult } from "./adminApi.ts";
import { makeAdminPage, makeAdminUser } from "./adminFixtures.ts";
import { useAdminList } from "./useAdminList.ts";

interface TestQuery {
  q: string;
  pagina: number;
}

type TestPage = ReturnType<typeof makeAdminPage<ReturnType<typeof makeAdminUser>>>;

const ana = makeAdminUser({ id: "u1", username: "ana" });
const beto = makeAdminUser({ id: "u2", username: "beto" });

function ok(page: TestPage): AdminResult<TestPage> {
  return { ok: true, data: page };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAdminList", () => {
  it("goes from loading to ready with the page", async () => {
    const fetcher = vi.fn(async () => ok(makeAdminPage([ana])));
    const { result } = renderHook(() =>
      useAdminList<TestQuery, typeof ana>(fetcher, { q: "", pagina: 1 }),
    );

    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {});

    expect(result.current.state).toEqual({
      status: "ready",
      data: makeAdminPage([ana]),
      refreshing: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith({ q: "", pagina: 1 });
  });

  it("does not refetch when only the identity of the query changes", async () => {
    const fetcher = vi.fn(async () => ok(makeAdminPage([ana])));
    const { rerender } = renderHook(
      ({ query }: { query: TestQuery }) =>
        useAdminList<TestQuery, typeof ana>(fetcher, query),
      { initialProps: { query: { q: "", pagina: 1 } } },
    );
    await act(async () => {});

    rerender({ query: { q: "", pagina: 1 } });
    await act(async () => {});

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("goes back to loading and refetches when a filter changes", async () => {
    const fetcher = vi.fn(async (query: TestQuery) =>
      ok(makeAdminPage(query.q === "beto" ? [beto] : [ana])),
    );
    const { result, rerender } = renderHook(
      ({ query }: { query: TestQuery }) =>
        useAdminList<TestQuery, typeof ana>(fetcher, query),
      { initialProps: { query: { q: "", pagina: 1 } } },
    );
    await act(async () => {});

    rerender({ query: { q: "beto", pagina: 1 } });
    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {});

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.state).toMatchObject({
      status: "ready",
      data: { items: [beto] },
    });
  });

  it("discards a late answer from an older query", async () => {
    const first = deferred<AdminResult<TestPage>>();
    const second = deferred<AdminResult<TestPage>>();
    const fetcher = vi
      .fn<(query: TestQuery) => Promise<AdminResult<TestPage>>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(
      ({ query }: { query: TestQuery }) =>
        useAdminList<TestQuery, typeof ana>(fetcher, query),
      { initialProps: { query: { q: "a", pagina: 1 } } },
    );

    rerender({ query: { q: "b", pagina: 1 } });
    await act(async () => {
      second.resolve(ok(makeAdminPage([beto])));
    });
    await act(async () => {
      first.resolve(ok(makeAdminPage([ana])));
    });

    expect(result.current.state).toMatchObject({
      status: "ready",
      data: { items: [beto] },
    });
  });

  it("shows the Spanish error and the HTTP status", async () => {
    const fetcher = vi.fn(
      async (): Promise<AdminResult<TestPage>> => ({
        ok: false,
        message: "No tienes permiso para realizar esta acción.",
        status: 403,
      }),
    );
    const { result } = renderHook(() =>
      useAdminList<TestQuery, typeof ana>(fetcher, { q: "", pagina: 1 }),
    );
    await act(async () => {});

    expect(result.current.state).toEqual({
      status: "error",
      message: "No tienes permiso para realizar esta acción.",
      httpStatus: 403,
    });
  });

  it("reload keeps the rows visible while refreshing", async () => {
    const refreshed = deferred<AdminResult<TestPage>>();
    const fetcher = vi
      .fn<(query: TestQuery) => Promise<AdminResult<TestPage>>>()
      .mockResolvedValueOnce(ok(makeAdminPage([ana])))
      .mockReturnValueOnce(refreshed.promise);
    const { result } = renderHook(() =>
      useAdminList<TestQuery, typeof ana>(fetcher, { q: "", pagina: 1 }),
    );
    await act(async () => {});

    act(() => {
      result.current.reload();
    });

    expect(result.current.state).toEqual({
      status: "ready",
      data: makeAdminPage([ana]),
      refreshing: true,
    });
    await act(async () => {
      refreshed.resolve(ok(makeAdminPage([beto])));
    });
    expect(result.current.state).toEqual({
      status: "ready",
      data: makeAdminPage([beto]),
      refreshing: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reload from an error goes through loading", async () => {
    const fetcher = vi
      .fn<(query: TestQuery) => Promise<AdminResult<TestPage>>>()
      .mockResolvedValueOnce({ ok: false, message: "Falló.", status: 500 })
      .mockResolvedValueOnce(ok(makeAdminPage([ana])));
    const { result } = renderHook(() =>
      useAdminList<TestQuery, typeof ana>(fetcher, { q: "", pagina: 1 }),
    );
    await act(async () => {});
    expect(result.current.state.status).toBe("error");

    act(() => {
      result.current.reload();
    });
    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {});

    expect(result.current.state.status).toBe("ready");
  });

  it("goes back a page when the API adjusts it, without a second request (RF-14)", async () => {
    const onPageAdjusted = vi.fn();
    // Pedir la página 3 cuando solo hay 2: la API responde la 2.
    const fetcher = vi.fn(async () =>
      ok(makeAdminPage([ana], { pagina: 2, totalPaginas: 2, total: 21 })),
    );
    const { result, rerender } = renderHook(
      ({ query }: { query: TestQuery }) =>
        useAdminList<TestQuery, typeof ana>(fetcher, query, { onPageAdjusted }),
      { initialProps: { query: { q: "", pagina: 3 } } },
    );
    await act(async () => {});

    expect(onPageAdjusted).toHaveBeenCalledExactlyOnceWith(2);
    // La página sincroniza la URL y la consulta pasa a la página 2.
    rerender({ query: { q: "", pagina: 2 } });
    await act(async () => {});

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.state).toMatchObject({
      status: "ready",
      data: { pagina: 2 },
    });
  });

  it("does not call onPageAdjusted when the page is the requested one", async () => {
    const onPageAdjusted = vi.fn();
    const fetcher = vi.fn(async () => ok(makeAdminPage([ana])));
    renderHook(() =>
      useAdminList<TestQuery, typeof ana>(
        fetcher,
        { q: "", pagina: 1 },
        { onPageAdjusted },
      ),
    );
    await act(async () => {});

    expect(onPageAdjusted).not.toHaveBeenCalled();
  });

  it("after an adjustment, reload requests the current page again", async () => {
    const fetcher = vi
      .fn<(query: TestQuery) => Promise<AdminResult<TestPage>>>()
      .mockResolvedValueOnce(ok(makeAdminPage([ana], { pagina: 2, totalPaginas: 2 })))
      .mockResolvedValueOnce(ok(makeAdminPage([beto], { pagina: 2, totalPaginas: 2 })));
    const { result, rerender } = renderHook(
      ({ query }: { query: TestQuery }) =>
        useAdminList<TestQuery, typeof ana>(fetcher, query),
      { initialProps: { query: { q: "", pagina: 3 } } },
    );
    await act(async () => {});
    rerender({ query: { q: "", pagina: 2 } });

    act(() => {
      result.current.reload();
    });
    await act(async () => {});

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith({ q: "", pagina: 2 });
  });

  it("updateItems replaces rows without a request", async () => {
    const fetcher = vi.fn(async () => ok(makeAdminPage([ana, beto])));
    const { result } = renderHook(() =>
      useAdminList<TestQuery, typeof ana>(fetcher, { q: "", pagina: 1 }),
    );
    await act(async () => {});

    act(() => {
      result.current.updateItems((items) =>
        items.map((item) =>
          item.id === "u2" ? { ...item, role: "admin" as const } : item,
        ),
      );
    });

    expect(result.current.state).toMatchObject({
      status: "ready",
      data: { items: [ana, { ...beto, role: "admin" }] },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
