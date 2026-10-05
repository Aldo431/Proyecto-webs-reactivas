import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeProduct } from "../logic/productFixtures.ts";
import type { FeaturedProductsSource } from "../logic/productRepository.ts";
import { CartProvider } from "../context/CartContext.tsx";
import { FeaturedProducts } from "./FeaturedProducts.tsx";

interface BlurFadeCall {
  duration: number | undefined;
  delay: number | undefined;
}

// Records the timing props each card passes to BlurFade, and renders the
// children as they are so the cards stay queryable.
const blurFadeCalls: BlurFadeCall[] = [];

vi.mock("./magicui/blur-fade.tsx", () => ({
  BlurFade: ({
    children,
    duration,
    delay,
  }: {
    children: ReactNode;
    duration?: number;
    delay?: number;
  }) => {
    blurFadeCalls.push({ duration, delay });
    return <div>{children}</div>;
  },
}));

const featured = [
  makeProduct({ id: "taza-dcc", name: "Taza DCC" }),
  makeProduct({ id: "polera-dcc", name: "Polera DCC" }),
  makeProduct({ id: "sticker-dcc", name: "Sticker DCC" }),
];

const successSource: FeaturedProductsSource = () => Promise.resolve(featured);
const pendingSource: FeaturedProductsSource = () => new Promise(() => {});
const failingSource: FeaturedProductsSource = () =>
  Promise.reject(new Error("fallo de prueba"));
const emptySource: FeaturedProductsSource = () => Promise.resolve([]);

function productLinks(): HTMLElement[] {
  return screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/producto/"));
}

function expectSeeMoreLink(): void {
  expect(
    screen.getByRole("link", { name: "Ver más productos" }).getAttribute("href"),
  ).toBe("/catalogo");
}

function renderSection(source: FeaturedProductsSource) {
  return render(
    <MemoryRouter>
      <CartProvider>
        <FeaturedProducts source={source} />
      </CartProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  blurFadeCalls.length = 0;
});

describe("FeaturedProducts", () => {
  it("shows the heading and links each featured product to its detail", async () => {
    renderSection(successSource);

    expect(screen.getByRole("heading", { name: "Destacados" })).toBeDefined();
    expect(await screen.findByText("Taza DCC")).toBeDefined();
    const hrefs = featured.map((product) =>
      screen
        .getByRole("link", { name: new RegExp(product.name) })
        .getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/producto/taza-dcc",
      "/producto/polera-dcc",
      "/producto/sticker-dcc",
    ]);
  });

  it("staggers the card entrance: base duration, index × fast delay", async () => {
    renderSection(successSource);
    await screen.findByText("Sticker DCC");

    // The last render of each card holds the props it ends up with.
    const lastCalls = blurFadeCalls.slice(-featured.length);
    expect(lastCalls.map((call) => call.duration)).toEqual([0.25, 0.25, 0.25]);
    const delays = lastCalls.map((call) => call.delay ?? Number.NaN);
    [0, 0.15, 0.3].forEach((expected, index) => {
      expect(delays[index]).toBeCloseTo(expected);
    });
  });

  it("links to the full catalog with Ver más productos", () => {
    renderSection(successSource);
    expect(
      screen.getByRole("link", { name: "Ver más productos" }).getAttribute("href"),
    ).toBe("/catalogo");
  });

  describe("states", () => {
    it("shows a loading status and no cards while the source is pending", () => {
      renderSection(pendingSource);

      expect(screen.getByRole("status").textContent).toBe(
        "Cargando productos destacados…",
      );
      expect(productLinks()).toHaveLength(0);
      expect(screen.getByRole("heading", { name: "Destacados" })).toBeDefined();
      expectSeeMoreLink();
    });

    it("shows an alert with a retry button when the source fails", async () => {
      renderSection(failingSource);

      const alert = await screen.findByRole("alert");
      expect(
        within(alert).getByText("No pudimos cargar los productos destacados."),
      ).toBeDefined();
      expect(
        within(alert).getByRole("button", { name: "Reintentar" }),
      ).toBeDefined();
      expect(productLinks()).toHaveLength(0);
      expectSeeMoreLink();

      // Error uses the amber destructive token, never the brand red (DS RF-3).
      expect(alert.className).toContain("border-destructive");
      expect(alert.querySelector(".text-destructive")).not.toBeNull();
      expect(alert.outerHTML).not.toMatch(/brand-red|terminal-prompt/);
      const icon = alert.querySelector("svg");
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
    });

    it("goes back to loading and calls the source again on Reintentar", async () => {
      let calls = 0;
      const source: FeaturedProductsSource = () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new Error("fallo de prueba"))
          : new Promise(() => {});
      };
      renderSection(source);

      fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

      expect(calls).toBe(2);
      expect(screen.getByRole("status").textContent).toBe(
        "Cargando productos destacados…",
      );
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows an empty message with a catalog link when nothing is featured", async () => {
      renderSection(emptySource);

      expect(
        await screen.findByText("Aún no hay productos destacados."),
      ).toBeDefined();
      expect(
        screen
          .getByRole("link", { name: "Ver catálogo completo" })
          .getAttribute("href"),
      ).toBe("/catalogo");
      expect(productLinks()).toHaveLength(0);
      expectSeeMoreLink();
    });
  });
});
