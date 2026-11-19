import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext.tsx";
import { jsonResponse, stubAuthFetch } from "../../test/authMocks.ts";
import { AdminLayout } from "./AdminLayout.tsx";
import { AdminSectionHeading } from "./AdminSectionHeading.tsx";

const adminUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "admin",
};

function renderLayout(path: string) {
  stubAuthFetch({ "/api/auth/me": () => jsonResponse(200, adminUser) });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminSectionHeading path="/admin" />} />
            <Route
              path="productos"
              element={<AdminSectionHeading path="/admin/productos" />}
            />
            <Route
              path="usuarios"
              element={<AdminSectionHeading path="/admin/usuarios" />}
            />
            <Route
              path="resenas"
              element={<AdminSectionHeading path="/admin/resenas" />}
            />
          </Route>
          <Route path="/" element={<p>Inicio (sonda)</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminLayout", () => {
  it("shows the brand, the admin badge and the four sections", async () => {
    renderLayout("/admin");
    expect(await screen.findByText("@anaperez · administrador")).toBeDefined();

    expect(screen.getByText("admin")).toBeDefined();
    const nav = screen.getByRole("navigation", { name: "Administración" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Resumen", "Productos", "Usuarios", "Reseñas"]);
  });

  it("marks only the current section with aria-current", async () => {
    renderLayout("/admin/usuarios");
    await screen.findByRole("heading", { level: 1, name: "Usuarios" });

    const nav = screen.getByRole("navigation", { name: "Administración" });
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Usuarios"]);
  });

  it("does not mark the overview as current on a subsection", async () => {
    renderLayout("/admin/productos");
    await screen.findByRole("heading", { level: 1, name: "Productos" });

    const nav = screen.getByRole("navigation", { name: "Administración" });
    expect(
      within(nav).getByRole("link", { name: "Resumen" }).getAttribute(
        "aria-current",
      ),
    ).toBeNull();
  });

  it("navigates between sections", async () => {
    renderLayout("/admin");
    await screen.findByRole("heading", { level: 1, name: "Resumen" });

    const nav = screen.getByRole("navigation", { name: "Administración" });
    fireEvent.click(within(nav).getByRole("link", { name: "Reseñas" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Reseñas" }),
    ).toBeDefined();
    expect(
      within(nav).getByRole("link", { name: "Reseñas" }).getAttribute(
        "aria-current",
      ),
    ).toBe("page");
  });

  it("shows the admin card and the way back to the store", async () => {
    renderLayout("/admin");
    expect(await screen.findByText("Ana Pérez")).toBeDefined();
    expect(screen.getByText("@anaperez · administrador")).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "Volver a la tienda" })
        .getAttribute("href"),
    ).toBe("/");
  });
});
