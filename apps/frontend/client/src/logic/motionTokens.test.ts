import { describe, expect, it } from "vitest";
import globalCss from "../styles.css?raw";
import {
  DURATION_MS,
  DURATION_S,
  EASE_STANDARD,
  toSeconds,
} from "./motionTokens.ts";

describe("motion tokens", () => {
  it("defines the 150/250/400 ms scale", () => {
    expect(DURATION_MS).toEqual({ fast: 150, base: 250, slow: 400 });
  });

  it("converts milliseconds to seconds for Motion", () => {
    expect(toSeconds(250)).toBe(0.25);
    expect(DURATION_S).toEqual({ fast: 0.15, base: 0.25, slow: 0.4 });
  });

  it("defines the standard easing curve", () => {
    expect(EASE_STANDARD).toEqual([0.2, 0, 0, 1]);
  });
});

describe("global CSS motion variables", () => {
  it("declares the same durations as the TypeScript tokens", () => {
    expect(globalCss).toMatch(/--duration-fast:\s*150ms;/);
    expect(globalCss).toMatch(/--duration-base:\s*250ms;/);
    expect(globalCss).toMatch(/--duration-slow:\s*400ms;/);
  });

  it("declares the same standard easing curve", () => {
    expect(globalCss).toMatch(
      /--ease-standard:\s*cubic-bezier\(0\.2,\s*0,\s*0,\s*1\);/,
    );
  });

  it("disables CSS animations and transitions under reduced motion", () => {
    expect(globalCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*animation-duration:[\s\S]*transition-duration:/,
    );
  });
});
