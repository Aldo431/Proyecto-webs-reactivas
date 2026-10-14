import { describe, expect, it } from "vitest";
import { HERO_BUDGET_MS, buildHeroTimeline } from "./heroTimeline.ts";

const COMMAND = "./tiendadcc --start";
const OUTPUT_LINES = [
  "Hola, mundo.",
  "Compila tu estilo: tazas, poleras, stickers y pins.",
];

describe("buildHeroTimeline", () => {
  const timeline = buildHeroTimeline(COMMAND, OUTPUT_LINES);

  it("finishes the whole hero before 2000 ms", () => {
    expect(HERO_BUDGET_MS).toBe(2000);
    expect(timeline.endMs).toBeLessThan(2000);
  });

  it("types the 19-character command at 47 ms per character, before 1100 ms", () => {
    expect(COMMAND).toHaveLength(19);
    expect(timeline.command.charIntervalMs).toBe(47);
    expect(timeline.command.startMs).toBe(200);
    expect(timeline.command.endMs).toBeLessThan(1100);
  });

  it("starts the output after the command and chains the lines", () => {
    const [hello, compile] = timeline.outputLines;
    expect(hello?.text).toBe("Hola, mundo.");
    expect(hello?.startMs).toBe(1100);
    expect(hello?.startMs).toBeGreaterThanOrEqual(timeline.command.endMs);
    expect(hello?.endMs).toBe(1350);
    expect(compile?.startMs).toBe(hello?.endMs);
    expect(compile?.endMs).toBe(1600);
  });

  it("gives each output line the base duration (250 ms)", () => {
    for (const line of timeline.outputLines) {
      expect(line.durationMs).toBe(250);
    }
  });

  it("reveals the title before 700 ms and ends the border beam by 1800 ms", () => {
    expect(timeline.title.startMs).toBe(0);
    expect(timeline.title.endMs).toBeLessThanOrEqual(700);
    expect(timeline.title.speedMs * timeline.title.maxIterations).toBe(
      timeline.title.endMs,
    );
    expect(timeline.borderBeam.endMs).toBeLessThanOrEqual(1800);
  });

  it("still fits a 90-character command by typing faster", () => {
    const longCommand = "x".repeat(90);
    const longTimeline = buildHeroTimeline(longCommand, OUTPUT_LINES);
    expect(longTimeline.command.charIntervalMs).toBe(10);
    expect(longTimeline.command.endMs).toBeLessThanOrEqual(1100);
    expect(longTimeline.endMs).toBeLessThan(2000);
  });

  it("rejects commands that cannot fit the typing window", () => {
    expect(() => buildHeroTimeline("", OUTPUT_LINES)).toThrow(RangeError);
    expect(() => buildHeroTimeline("x".repeat(901), OUTPUT_LINES)).toThrow(
      RangeError,
    );
  });

  it("rejects output that would end the hero after the budget", () => {
    const tooManyLines = ["a", "b", "c", "d"];
    expect(() => buildHeroTimeline(COMMAND, tooManyLines)).toThrow(RangeError);
  });
});
