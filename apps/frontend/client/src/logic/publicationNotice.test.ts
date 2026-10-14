import { describe, expect, it } from "vitest";
import { noticeState, readNotice, PUBLISHED_NOTICE } from "./publicationNotice.ts";

describe("readNotice", () => {
  it("reads a notice created by noticeState", () => {
    expect(readNotice(noticeState(PUBLISHED_NOTICE))).toBe(PUBLISHED_NOTICE);
  });

  it.each([null, undefined, "x", 3, {}, { notice: 3 }, { notice: "" }])(
    "returns null for %j",
    (state) => {
      expect(readNotice(state)).toBeNull();
    },
  );
});
