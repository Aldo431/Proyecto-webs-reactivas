import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeReview } from "./reviewFixtures.ts";
import type { ReviewApi } from "./useReviews.ts";
import { useReviews } from "./useReviews.ts";

const review = makeReview();
const exampleList = { reviews: [review], total: 1, promedioRating: 4 };

describe("useReviews", () => {
  it("goes from loading to success", async () => {
    const api = defaultApiFixture();
    const { result } = renderHook(() => useReviews("p1", api));

    expect(result.current.state).toEqual({ status: "loading" });
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "success",
        list: exampleList,
      });
    });
  });

  it("reports an error with the message", async () => {
    const api = defaultApiFixture({
      fetchReviews: () => Promise.resolve({ ok: false, message: "Falla" }),
    });
    const { result } = renderHook(() => useReviews("p1", api));

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "error", message: "Falla" });
    });
  });

  it("retries after an error", async () => {
    const fetchReviews = vi
      .fn<ReviewApi["fetchReviews"]>()
      .mockResolvedValueOnce({ ok: false, message: "Falla" })
      .mockResolvedValueOnce({ ok: true, list: exampleList });
    const api = defaultApiFixture({ fetchReviews });
    const { result } = renderHook(() => useReviews("p1", api));

    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    });
    act(() => {
      result.current.retry();
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "success",
        list: exampleList,
      });
    });
    expect(fetchReviews).toHaveBeenCalledTimes(2);
  });

  it("reloads the list after adding a review", async () => {
    const fetchReviews = vi.fn<ReviewApi["fetchReviews"]>(() =>
      Promise.resolve({ ok: true, list: exampleList }),
    );
    const createReview = vi
      .fn<ReviewApi["createReview"]>()
      .mockResolvedValue({ ok: true, review: exampleList.reviews[0]! });
    const api = defaultApiFixture({ fetchReviews, createReview });
    const { result } = renderHook(() => useReviews("p1", api));
    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });
    expect(fetchReviews).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.addReview({ rating: 4, comment: "Buena." });
    });

    await waitFor(() => {
      expect(fetchReviews).toHaveBeenCalledTimes(2);
    });
  });

  it("does not reload when the mutation fails", async () => {
    const fetchReviews = vi
      .fn<ReviewApi["fetchReviews"]>()
      .mockResolvedValue({ ok: true, list: exampleList });
    const api = defaultApiFixture({
      fetchReviews,
      createReview: () =>
        Promise.resolve({ ok: false, message: "Ya has reseñado este producto." }),
    });
    const { result } = renderHook(() => useReviews("p1", api));
    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });

    const outcome = await result.current.addReview({
      rating: 5,
      comment: "x",
    });

    expect(outcome).toEqual({
      ok: false,
      message: "Ya has reseñado este producto.",
    });
    expect(fetchReviews).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe("success");
  });

  it("reloads after removeReview succeeds", async () => {
    const fetchReviews = vi
      .fn<ReviewApi["fetchReviews"]>()
      .mockResolvedValue({ ok: true, list: exampleList });
    const api = defaultApiFixture({
      fetchReviews,
      deleteReview: () => Promise.resolve({ ok: true }),
    });
    const { result } = renderHook(() => useReviews("p1", api));
    await waitFor(() => {
      expect(result.current.state.status).toBe("success");
    });

    await act(async () => {
      await result.current.removeReview("r1");
    });

    expect(fetchReviews).toHaveBeenCalledTimes(2);
  });
});

function defaultApiFixture(
  overrides: Partial<ReviewApi> = {},
): ReviewApi {
  return {
    fetchReviews: () => Promise.resolve({ ok: true, list: exampleList }),
    createReview: () => Promise.resolve({ ok: true, review: makeReview() }),
    updateReview: () => Promise.resolve({ ok: true, review: makeReview() }),
    deleteReview: () => Promise.resolve({ ok: true }),
    ...overrides,
  };
}
