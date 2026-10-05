// Motion scale of the design system (specs/00-design-system, RF-6). The same
// values live as CSS variables in styles.css; motionTokens.test.ts keeps both
// in sync. Components read durations from here instead of hard-coding them.

export const DURATION_MS = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export type DurationName = keyof typeof DURATION_MS;

export function toSeconds(milliseconds: number): number {
  return milliseconds / 1000;
}

// Motion expects durations in seconds.
export const DURATION_S: Record<DurationName, number> = {
  fast: toSeconds(DURATION_MS.fast),
  base: toSeconds(DURATION_MS.base),
  slow: toSeconds(DURATION_MS.slow),
};

// cubic-bezier(0.2, 0, 0, 1), as a Motion easing tuple.
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;
