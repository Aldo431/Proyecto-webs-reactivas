import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import { usePromotions } from "./usePromotions.ts";

const active = {
  id: "promo-activa",
  type: "quantityPack3x2",
  label: "Pack 3x2",
  active: true,
  startsAt: null,
  endsAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const inactive = {
  ...active,
  id: "promo-inactiva",
  active: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePromotions", () => {
  it("expone solo las promociones vigentes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, [active, inactive])));

    const { result } = renderHook(() => usePromotions());

    expect(result.current).toEqual([]);
    await waitFor(() => {
      expect(result.current).toEqual([active]);
    });
  });

  it("ignora errores de carga y mantiene la lista vacía", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(503, {})));

    const { result } = renderHook(() => usePromotions());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(result.current).toEqual([]);
  });
});
