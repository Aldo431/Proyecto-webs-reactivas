import { describe, expect, it } from "vitest";

// Guard for third-party code copied into the repo (specs/00-design-system,
// RF-10, RF-11, RF-12; plan D14). It stands in for lint rules: no Next.js
// code, only approved imports, and an origin header on every file.

const thirdPartySources = import.meta.glob<string>(
  [
    "./components/ui/**/*.{ts,tsx}",
    "./components/magicui/**/*.{ts,tsx}",
    "./components/reactbits/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  { query: "?raw", import: "default", eager: true },
);

const ALLOWED_IMPORTS = new Set([
  "react",
  "motion/react",
  "radix-ui",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "lucide-react",
  "@/lib/utils",
  // alert-dialog builds its buttons from the shadcn `Button` primitive.
  "@/components/ui/button",
]);

const HEADER_LABELS = ["Origen:", "URL:", "Incorporado:", "Cambios:"];

function importSpecifiers(source: string): string[] {
  const patterns = [
    /(?:^|\n)\s*(?:import|export)\s[^;]*?\sfrom\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1] ?? ""),
  );
}

function leadingComment(source: string): string {
  const match = /^\s*\/\*[\s\S]*?\*\//.exec(source);
  return match?.[0] ?? "";
}

const files = Object.entries(thirdPartySources);

describe("third-party code guard", () => {
  it("finds the third-party files to check", () => {
    expect(files.map(([path]) => path)).toContain("./lib/utils.ts");
  });

  describe.each(files)("%s", (_path, source) => {
    it('has no "use client" directive', () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
    });

    it("does not import Next.js modules or next-themes", () => {
      const nextImports = importSpecifiers(source).filter(
        (specifier) =>
          specifier === "next" ||
          specifier.startsWith("next/") ||
          specifier === "next-themes",
      );
      expect(nextImports).toEqual([]);
    });

    it("only imports approved modules", () => {
      const unapproved = importSpecifiers(source).filter(
        (specifier) => !ALLOWED_IMPORTS.has(specifier),
      );
      expect(unapproved).toEqual([]);
    });

    it("starts with an origin header", () => {
      const header = leadingComment(source);
      for (const label of HEADER_LABELS) {
        expect(header).toContain(label);
      }
    });
  });
});
