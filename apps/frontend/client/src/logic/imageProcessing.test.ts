import { describe, expect, it, vi } from "vitest";
import {
  IMAGE_ORIGINAL_SIZE_ERROR,
  IMAGE_TOO_HEAVY_ERROR,
  IMAGE_TYPE_ERROR,
  IMAGE_UNREADABLE_ERROR,
  computeTargetDimensions,
  encodeWithinLimit,
  estimateDataUrlBytes,
  processImageFile,
  validateImageFile,
  type ImageDeps,
} from "./imageProcessing.ts";

function dataUrl(mime: string, bytes: number): string {
  // 3 bytes -> 4 base64 chars (sin relleno si bytes es múltiplo de 3).
  return `data:${mime};base64,${"A".repeat((bytes / 3) * 4)}`;
}

function makeFile(type: string, size = 1000): File {
  const file = new File(["x"], "foto", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(validateImageFile({ type, size: 1000 })).toBeNull();
  });

  it.each(["image/gif", "image/svg+xml", "text/html", ""])(
    "rejects %s",
    (type) => {
      expect(validateImageFile({ type, size: 1000 })).toBe(IMAGE_TYPE_ERROR);
    },
  );

  it("rejects originals above 10 MB but accepts exactly 10 MB", () => {
    const tenMb = 10 * 1024 * 1024;
    expect(validateImageFile({ type: "image/png", size: tenMb })).toBeNull();
    expect(validateImageFile({ type: "image/png", size: tenMb + 1 })).toBe(
      IMAGE_ORIGINAL_SIZE_ERROR,
    );
  });
});

describe("computeTargetDimensions", () => {
  it("scales landscape images to 1200 wide", () => {
    expect(computeTargetDimensions(4000, 3000)).toEqual({
      width: 1200,
      height: 900,
    });
  });

  it("scales portrait images to 1200 high", () => {
    expect(computeTargetDimensions(3000, 4000)).toEqual({
      width: 900,
      height: 1200,
    });
  });

  it("scales square images", () => {
    expect(computeTargetDimensions(2400, 2400)).toEqual({
      width: 1200,
      height: 1200,
    });
  });

  it("does not enlarge small images", () => {
    expect(computeTargetDimensions(800, 600)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("never returns a zero side", () => {
    expect(computeTargetDimensions(100000, 10).height).toBe(1);
  });
});

describe("estimateDataUrlBytes", () => {
  it("decodes the base64 size", () => {
    expect(estimateDataUrlBytes(dataUrl("image/png", 300))).toBe(300);
  });

  it("accounts for padding", () => {
    expect(estimateDataUrlBytes("data:image/png;base64,QQ==")).toBe(1);
  });

  it("returns 0 without a payload", () => {
    expect(estimateDataUrlBytes("data:image/png")).toBe(0);
  });
});

describe("encodeWithinLimit", () => {
  it("stops at the first quality that fits", async () => {
    const encodeAt = vi.fn(() => Promise.resolve(dataUrl("image/webp", 300)));
    const result = await encodeWithinLimit(encodeAt, 1000);
    expect(result.ok).toBe(true);
    expect(encodeAt).toHaveBeenCalledTimes(1);
    expect(encodeAt).toHaveBeenCalledWith(0.8);
  });

  it("lowers the quality down to 0.5", async () => {
    const sizes: Record<number, number> = { 0.8: 3000, 0.7: 2400, 0.6: 1800, 0.5: 900 };
    const encodeAt = vi.fn((quality: number) =>
      Promise.resolve(dataUrl("image/webp", sizes[quality] ?? 0)),
    );
    const result = await encodeWithinLimit(encodeAt, 1000);
    expect(result.ok).toBe(true);
    expect(encodeAt.mock.calls.map(([quality]) => quality)).toEqual([
      0.8, 0.7, 0.6, 0.5,
    ]);
  });

  it("fails with a clear message when nothing fits", async () => {
    const encodeAt = vi.fn(() => Promise.resolve(dataUrl("image/webp", 3000)));
    const result = await encodeWithinLimit(encodeAt, 1000);
    expect(result).toEqual({ ok: false, message: IMAGE_TOO_HEAVY_ERROR });
    expect(encodeAt).toHaveBeenCalledTimes(4);
  });
});

describe("processImageFile", () => {
  function fakeDeps(overrides: Partial<ImageDeps> = {}): ImageDeps {
    return {
      decode: vi.fn(() => Promise.resolve({ width: 4000, height: 3000 })),
      encode: vi.fn((_file, _size, mime) =>
        Promise.resolve(dataUrl(mime, 300)),
      ),
      ...overrides,
    };
  }

  it("encodes WebP at the reduced size when supported", async () => {
    const deps = fakeDeps();
    const result = await processImageFile(makeFile("image/jpeg"), deps);
    expect(result.ok && result.dataUrl.startsWith("data:image/webp")).toBe(true);
    expect(deps.encode).toHaveBeenCalledTimes(1);
    expect(deps.encode).toHaveBeenCalledWith(
      expect.anything(),
      { width: 1200, height: 900 },
      "image/webp",
      0.8,
    );
  });

  it("falls back to JPEG when the browser returns PNG for WebP", async () => {
    const deps = fakeDeps({
      encode: vi.fn((_file, _size, mime) =>
        Promise.resolve(dataUrl(mime === "image/webp" ? "image/png" : mime, 300)),
      ),
    });
    const result = await processImageFile(makeFile("image/png"), deps);
    expect(result.ok && result.dataUrl.startsWith("data:image/jpeg")).toBe(true);
  });

  it("rejects invalid files without decoding them", async () => {
    const deps = fakeDeps();
    const result = await processImageFile(makeFile("image/gif"), deps);
    expect(result).toEqual({ ok: false, message: IMAGE_TYPE_ERROR });
    expect(deps.decode).not.toHaveBeenCalled();
  });

  it("reports undecodable images", async () => {
    const deps = fakeDeps({ decode: vi.fn(() => Promise.reject(new Error("x"))) });
    const result = await processImageFile(makeFile("image/png"), deps);
    expect(result).toEqual({ ok: false, message: IMAGE_UNREADABLE_ERROR });
  });

  it("reports an error when the result stays above 1 MB", async () => {
    const deps = fakeDeps({
      encode: vi.fn((_file, _size, mime) =>
        Promise.resolve(dataUrl(mime, 1_200_000)),
      ),
    });
    const result = await processImageFile(makeFile("image/png"), deps);
    expect(result).toEqual({ ok: false, message: IMAGE_TOO_HEAVY_ERROR });
  });
});
