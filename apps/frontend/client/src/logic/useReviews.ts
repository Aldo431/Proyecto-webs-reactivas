import type {
  CreateReviewInput,
  ReviewList,
  UpdateReviewInput,
} from "@tiendadcc/utils";
import { useCallback, useEffect, useState } from "react";
import {
  createReview as createReviewRequest,
  deleteReview as deleteReviewRequest,
  fetchReviews,
  updateReview as updateReviewRequest,
  type DeleteReviewResult,
  type ReviewListResult,
  type ReviewResult,
} from "./reviewApi.ts";

export type ReviewsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; list: ReviewList };

export interface ReviewsHook {
  state: ReviewsState;
  retry: () => void;
  addReview: (input: CreateReviewInput) => Promise<ReviewResult>;
  editReview: (
    reviewId: string,
    input: UpdateReviewInput,
  ) => Promise<ReviewResult>;
  removeReview: (reviewId: string) => Promise<DeleteReviewResult>;
}

export interface ReviewApi {
  fetchReviews: (productId: string) => Promise<ReviewListResult>;
  createReview: (
    productId: string,
    input: CreateReviewInput,
  ) => Promise<ReviewResult>;
  updateReview: (
    reviewId: string,
    input: UpdateReviewInput,
  ) => Promise<ReviewResult>;
  deleteReview: (reviewId: string) => Promise<DeleteReviewResult>;
}

const defaultApi: ReviewApi = {
  fetchReviews,
  createReview: createReviewRequest,
  updateReview: updateReviewRequest,
  deleteReview: deleteReviewRequest,
};

// Loads the reviews and its summary for a product (spec 010, RF-6). Mutations
// reload the list on success (D9) and return the raw result so the form can
// show field errors or a message. A late answer from a previous product never
// overwrites the current one.
export function useReviews(
  productId: string,
  api: ReviewApi = defaultApi,
): ReviewsHook {
  const [state, setState] = useState<ReviewsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setState({ status: "loading" });

    api.fetchReviews(productId).then((result) => {
      if (!isCurrent) return;
      if (result.ok) {
        setState({ status: "success", list: result.list });
      } else {
        setState({ status: "error", message: result.message });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [productId, api, attempt]);

  const reload = useCallback(() => {
    setAttempt((previous) => previous + 1);
  }, []);

  const addReview = useCallback(
    async (input: CreateReviewInput): Promise<ReviewResult> => {
      const result = await api.createReview(productId, input);
      if (result.ok) {
        reload();
      }
      return result;
    },
    [api, productId, reload],
  );

  const editReview = useCallback(
    async (
      reviewId: string,
      input: UpdateReviewInput,
    ): Promise<ReviewResult> => {
      const result = await api.updateReview(reviewId, input);
      if (result.ok) {
        reload();
      }
      return result;
    },
    [api, reload],
  );

  const removeReview = useCallback(
    async (reviewId: string): Promise<DeleteReviewResult> => {
      const result = await api.deleteReview(reviewId);
      if (result.ok) {
        reload();
      }
      return result;
    },
    [api, reload],
  );

  return { state, retry: reload, addReview, editReview, removeReview };
}
