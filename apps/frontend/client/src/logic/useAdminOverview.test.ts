import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAdminOverview } from "./adminApi.ts";
import { makeAdminOverview } from "./adminFixtures.ts";
import { useAdminOverview } from "./useAdminOverview.ts";

vi.mock("./adminApi.ts", () => ({ fetchAdminOverview: vi.fn() }));

const fetchMock = vi.mocked(fetchAdminOverview);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAdminOverview", () => {
  it("goes from loading to ready with the overview", async () => {
    const overview = makeAdminOverview();
    fetchMock.mockResolvedValue({ ok: true, data: overview });
    const { result } = renderHook(() => useAdminOverview());

    expect(result.current.state).toEqual({ status: "loading" });
    await act(async () => {});

    expect(result.current.state).toEqual({
      status: "ready",
      data: overview,
      refreshing: false,
    });
  });

  it("shows the error and Reintentar loads again", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        message: "No se pudo cargar el resumen.",
        status: 500,
      })
      .mockResolvedValueOnce({ ok: true, data: makeAdminOverview() });
    const { result } = renderHook(() => useAdminOverview());
    await act(async () => {});
    expect(result.current.state).toEqual({
      status: "error",
      message: "No se pudo cargar el resumen.",
      httpStatus: 500,
    });

    act(() => {
      result.current.reload();
    });
    await act(async () => {});

    expect(result.current.state.status).toBe("ready");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("Actualizar keeps the data visible and asks again", async () => {
    fetchMock.mockResolvedValue({ ok: true, data: makeAdminOverview() });
    const { result } = renderHook(() => useAdminOverview());
    await act(async () => {});

    act(() => {
      result.current.reload();
    });

    expect(result.current.state).toMatchObject({
      status: "ready",
      refreshing: true,
    });
    await act(async () => {});
    expect(result.current.state).toMatchObject({ refreshing: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks again when mounted again (no cache between visits)", async () => {
    fetchMock.mockResolvedValue({ ok: true, data: makeAdminOverview() });
    const first = renderHook(() => useAdminOverview());
    await act(async () => {});
    first.unmount();

    renderHook(() => useAdminOverview());
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("discards the answer of an unmounted hook", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchAdminOverview>>) => void;
    fetchMock.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result, unmount } = renderHook(() => useAdminOverview());
    unmount();

    await act(async () => {
      resolve({ ok: true, data: makeAdminOverview() });
    });

    expect(result.current.state).toEqual({ status: "loading" });
  });
});
