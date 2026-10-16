import { describe, expect, it } from "vitest";
import { makeReview } from "./reviewFixtures.ts";
import {
  averageStars,
  findOwnReview,
  formatAverageRating,
} from "./reviewFormat.ts";

describe("findOwnReview", () => {
  const mine = makeReview({ id: "mia", author: { id: "u1", username: "ana", displayName: "Ana" } });
  const other = makeReview({ id: "otra", author: { id: "u2", username: "beto", displayName: "Beto" } });

  it("returns the review of the session user", () => {
    expect(findOwnReview([other, mine], "u1")?.id).toBe("mia");
  });

  it("returns undefined when the user has not reviewed", () => {
    expect(findOwnReview([other], "u3")).toBeUndefined();
  });
});

describe("formatAverageRating", () => {
  it("returns null without reviews", () => {
    expect(formatAverageRating(null)).toBeNull();
  });

  it("formats integers without decimals", () => {
    expect(formatAverageRating(4)).toBe("4");
    expect(formatAverageRating(5)).toBe("5");
  });

  it("formats decimals with a comma and one or two places", () => {
    expect(formatAverageRating(4.25)).toBe("4,25");
    expect(formatAverageRating(4.5)).toBe("4,5");
  });
});

describe("averageStars", () => {
  it("returns 0 without reviews", () => {
    expect(averageStars(null)).toBe(0);
  });

  it("rounds to the nearest whole star across the 0-5 range", () => {
    expect(averageStars(0)).toBe(0);
    expect(averageStars(4.4)).toBe(4);
    expect(averageStars(4.5)).toBe(5);
    expect(averageStars(5)).toBe(5);
  });
});
