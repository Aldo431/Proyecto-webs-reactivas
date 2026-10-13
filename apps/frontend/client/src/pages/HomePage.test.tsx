import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPrefersReducedMotion } from "../testMedia.ts";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { stubAuthFetch } from "../test/authMocks.ts";
import { productRoutes } from "../test/productMocks.ts";
import { HomePage } from "./HomePage.tsx";

// Shows the current location so tests can check that nothing navigated.
function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  );
}

function renderHome() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <HomePage />
          <LocationProbe />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function currentLocation(): string {
  return screen.getByTestId("location").textContent ?? "";
}

beforeEach(() => {
  stubAuthFetch(productRoutes());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomePage", () => {
  it("links each category shortcut to the filtered catalog", async () => {
    renderHome();

    const heading = screen.getByRole("heading", { name: "Categorías" });
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getAllByRole("link")).toHaveLength(3);
    expect(
      ["Tazas", "Poleras", "Stickers"].map((name) =>
        within(section as HTMLElement)
          .getByRole("link", { name })
          .getAttribute("href"),
      ),
    ).toEqual([
      "/catalogo?categoria=tazas",
      "/catalogo?categoria=poleras",
      "/catalogo?categoria=stickers",
    ]);

    // Let the featured products finish loading before the test ends.
    await screen.findByText("Taza DCC");
  });

  describe("footer", () => {
    it("is the contentinfo landmark with the project, course and year", async () => {
      renderHome();
      const footer = screen.getByRole("contentinfo");
      expect(within(footer).getByText("TiendaDCC")).toBeDefined();
      expect(
        within(footer).getByText(
          "Proyecto del curso CC5003 — Aplicaciones Web Reactivas, 2026",
        ),
      ).toBeDefined();
      await screen.findByText("Taza DCC");
    });

    it("opens the DCC site in a new tab safely", async () => {
      renderHome();
      const link = within(screen.getByRole("contentinfo")).getByRole("link", {
        name: "Departamento de Ciencias de la Computación (DCC) (se abre en una pestaña nueva)",
      });
      expect(link.getAttribute("href")).toBe("https://www.dcc.uchile.cl");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      await screen.findByText("Taza DCC");
    });

    it("has no email address or mailto link", async () => {
      renderHome();
      const footer = screen.getByRole("contentinfo");
      expect(footer.querySelector('a[href^="mailto:"]')).toBeNull();
      expect(footer.textContent).not.toMatch(/@/);
      await screen.findByText("Taza DCC");
    });

    it("shows the informative pages as próximamente without navigating", async () => {
      renderHome();
      const footer = screen.getByRole("contentinfo");
      for (const page of [
        "Sobre la tienda",
        "Envíos y retiro",
        "Preguntas frecuentes",
        "Contacto",
      ]) {
        const item = within(footer).getByRole("button", {
          name: `${page} (próximamente)`,
        });
        expect(item.getAttribute("aria-disabled")).toBe("true");
      }

      const before = currentLocation();
      const contact = within(footer).getByRole("button", {
        name: "Contacto (próximamente)",
      });
      fireEvent.click(contact);
      fireEvent.keyDown(contact, { key: "Enter" });
      fireEvent.keyDown(contact, { key: " " });
      expect(currentLocation()).toBe(before);
      await screen.findByText("Taza DCC");
    });
  });

  describe("landmarks and keyboard", () => {
    it("starts the focus order with Saltar al contenido, which focuses main", async () => {
      const { container } = renderHome();

      const firstFocusable = container.querySelector<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      expect(firstFocusable?.textContent).toBe("Saltar al contenido");

      const before = currentLocation();
      fireEvent.click(screen.getByRole("link", { name: "Saltar al contenido" }));
      expect(document.activeElement).toBe(screen.getByRole("main"));
      expect(currentLocation()).toBe(before);
      await screen.findByText("Taza DCC");
    });

    it("has a single h1 and one h2 per section", async () => {
      renderHome();
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0]?.textContent).toContain("TiendaDCC");
      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["Destacados", "Categorías"]);
      await screen.findByText("Taza DCC");
    });

    it("exposes the banner, navigation, main and contentinfo landmarks", async () => {
      renderHome();
      expect(screen.getByRole("banner")).toBeDefined();
      expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
      expect(screen.getByRole("main")).toBeDefined();
      expect(screen.getByRole("contentinfo")).toBeDefined();
      await screen.findByText("Taza DCC");
    });

    it("navigates the top bar account accesses to login when anonymous", async () => {
      renderHome();
      const banner = screen.getByRole("banner");
      for (const name of ["Favoritos", "Perfil"]) {
        fireEvent.click(within(banner).getByRole("button", { name }));
        expect(currentLocation()).toBe("/iniciar-sesion");
      }

      const before = currentLocation();
      const cart = within(banner).getByRole("button", { name: "Carrito" });
      expect(cart.getAttribute("aria-disabled")).toBeNull();
      expect(cart.getAttribute("aria-expanded")).toBe("false");
      cart.focus();
      expect(document.activeElement).toBe(cart);
      fireEvent.click(cart);
      expect(cart.getAttribute("aria-expanded")).toBe("true");
      expect(currentLocation()).toBe(before);
      await screen.findByText("Taza DCC");
    });
  });

  describe("reduced motion", () => {
    // BorderBeam's outer element is the only one using this CSS variable.
    const BORDER_BEAM_SELECTOR = '[class*="--border-beam-width"]';

    function terminalText(container: HTMLElement): string {
      return container.querySelector("pre")?.textContent ?? "";
    }

    it("control: with motion, the command is typed later and the beam renders", async () => {
      const { container } = renderHome();
      expect(terminalText(container)).not.toContain("./tiendadcc --start");
      expect(container.querySelector(BORDER_BEAM_SELECTOR)).not.toBeNull();
      await screen.findByText("Taza DCC");
    });

    it("shows the whole hero on the first render, without the border beam", async () => {
      setPrefersReducedMotion(true);
      const { container } = renderHome();

      const text = terminalText(container);
      expect(text).toContain("./tiendadcc --start");
      expect(text).toContain("Hola, mundo.");
      expect(text).toContain("Compila tu estilo: tazas, poleras y stickers.");
      expect(screen.getByRole("heading", { level: 1, name: "TiendaDCC" }))
        .toBeDefined();
      // The visible (aria-hidden) scramble text is already final.
      expect(
        container.querySelector('h1 > [aria-hidden="true"] [aria-hidden="true"]')
          ?.textContent,
      ).toBe("TiendaDCC");
      expect(container.querySelector(BORDER_BEAM_SELECTOR)).toBeNull();
      await screen.findByText("Taza DCC");
    });
  });
});
