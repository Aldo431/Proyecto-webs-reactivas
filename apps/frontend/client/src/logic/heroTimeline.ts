import { DURATION_MS } from "./motionTokens.ts";

// Hero animation timeline (Home RF-2, RF-10). Every delay and duration the
// hero components receive comes from here, so the whole hero is guaranteed
// to finish before HERO_BUDGET_MS. Times are in milliseconds from first
// render; components convert them to seconds for Motion.

export const HERO_BUDGET_MS = 2000;

// Title reveal with DecryptedText: `maxIterations` scramble steps of
// `speedMs` each (12 x 50 ms = 600 ms, within the 700 ms of RF-10).
const TITLE_SPEED_MS = 50;
const TITLE_MAX_ITERATIONS = 12;

// The command is typed inside this window; the typing speed is derived from
// the command length so it always fits (RF-10).
const COMMAND_START_MS = 200;
const COMMAND_WINDOW_END_MS = 1100;

// Single border-beam pass around the terminal window.
const BORDER_BEAM_END_MS = 1800;

export interface TimelineStep {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface HeroTimeline {
  title: TimelineStep & { speedMs: number; maxIterations: number };
  command: TimelineStep & { charIntervalMs: number };
  outputLines: (TimelineStep & { text: string })[];
  borderBeam: TimelineStep;
  endMs: number;
}

function step(startMs: number, endMs: number): TimelineStep {
  return { startMs, endMs, durationMs: endMs - startMs };
}

export function buildHeroTimeline(
  command: string,
  outputLines: readonly string[],
): HeroTimeline {
  const typingWindowMs = COMMAND_WINDOW_END_MS - COMMAND_START_MS;
  if (command.length === 0 || command.length > typingWindowMs) {
    throw new RangeError(
      `Hero command must have 1-${typingWindowMs} characters to fit the typing window.`,
    );
  }

  const charIntervalMs = Math.floor(typingWindowMs / command.length);
  const typedEndMs = COMMAND_START_MS + charIntervalMs * command.length;

  // Output lines start when the typing window closes and follow each other.
  let lineStartMs = COMMAND_WINDOW_END_MS;
  const lines = outputLines.map((text) => {
    const line = {
      text,
      ...step(lineStartMs, lineStartMs + DURATION_MS.base),
    };
    lineStartMs = line.endMs;
    return line;
  });

  const title = {
    ...step(0, TITLE_SPEED_MS * TITLE_MAX_ITERATIONS),
    speedMs: TITLE_SPEED_MS,
    maxIterations: TITLE_MAX_ITERATIONS,
  };
  const borderBeam = step(0, BORDER_BEAM_END_MS);
  const endMs = Math.max(title.endMs, typedEndMs, lineStartMs, borderBeam.endMs);

  if (endMs >= HERO_BUDGET_MS) {
    throw new RangeError(
      `Hero timeline ends at ${endMs} ms, over the ${HERO_BUDGET_MS} ms budget.`,
    );
  }

  return {
    title,
    command: { ...step(COMMAND_START_MS, typedEndMs), charIntervalMs },
    outputLines: lines,
    borderBeam,
    endMs,
  };
}
