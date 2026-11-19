import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AdminUser } from "@tiendadcc/utils";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext.tsx";
import { makeAdminPage, makeAdminUser } from "../../logic/adminFixtures.ts";
import { jsonResponse } from "../../test/authMocks.ts";
import { stubApi, type RecordedCall } from "../../test/apiStub.ts";
import { AdminUsersPage } from "./AdminUsersPage.tsx";

const LIST = "/api/admin/users";

const me = makeAdminUser({
  id: "6713b0c2a1f4e9d2c8b70b00",
  username: "admina",
  displayName: "Admina Uno",
  email: "admina@dcc.uchile.cl",
  role: "admin",
  productCount: 1,
  createdAt: "2026-10-01T12:00:00.000Z",
});
const beto = makeAdminUser({
  id: "6713b0c2a1f4e9d2c8b70b02",
  username: "betoruiz",
  displayName: "Beto Ruiz",
  email: "beto@dcc.uchile.cl",
  role: "user",
  productCount: 2,
  reviewCount: 5,
  createdAt: "2026-11-10T12:00:00.000Z",
});
const carla = makeAdminUser({
  id: "6713b0c2a1f4e9d2c8b70b03",
  username: "carla",
  displayName: "Carla Soto",
  email: "carla@dcc.uchile.cl",
  role: "admin",
  createdAt: "2026-11-12T12:00:00.000Z",
});

// La sesión es la de `me`: `stubApi` responde /api/auth/me con este usuario.
const session = {
  id: me.id,
  username: me.username,
  displayName: me.displayName,
  email: me.email,
  role: "admin",
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
}

function renderPage(initial = "/admin/usuarios") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/admin/usuarios"
            element={
              <>
                <AdminUsersPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function listCalls(calls: RecordedCall[]) {
  return calls.filter((call) => call.method === "GET" && call.url.startsWith(LIST));
}

function search() {
  return screen.getByTestId("search").textContent;
}

function rowOf(text: string): HTMLElement {
  return screen.getByText(text).closest("tr") as HTMLElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdminUsersPage / datos", () => {
  it("shows every account with its columns, badges and counters", async () => {
    stubApi(session, (method, url) =>
      method === "GET" && url === LIST
        ? jsonResponse(200, makeAdminPage([me, beto, carla]))
        : undefined,
    );
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Usuarios" }),
    ).toBeDefined();
    expect(screen.getByText("Cargando usuarios…").getAttribute("aria-busy")).toBe(
      "true",
    );

    const row = (await screen.findByText("Beto Ruiz")).closest("tr") as HTMLElement;
    expect(within(row).getByText("@betoruiz").className).toContain("font-mono");
    expect(within(row).getByText("beto@dcc.uchile.cl")).toBeDefined();
    expect(within(row).getByText("Usuario")).toBeDefined();
    expect(within(row).getByText("2")).toBeDefined();
    expect(within(row).getByText("5")).toBeDefined();
    expect(within(row).getByText("10 nov 2026")).toBeDefined();
    expect(within(rowOf("Carla Soto")).getByText("Administrador")).toBeDefined();
    expect(row.parentElement?.parentElement?.parentElement?.className).toContain(
      "overflow-x-auto",
    );
  });

  it("marks the own account with (tú) and Tu cuenta, without a button", async () => {
    stubApi(session, (method, url) =>
      method === "GET" && url === LIST
        ? jsonResponse(200, makeAdminPage([me, beto]))
        : undefined,
    );
    renderPage();

    await waitFor(() => expect(screen.getByText("(tú)")).toBeDefined());
    const own = rowOf("Admina Uno");
    expect(within(own).getByText("Tu cuenta")).toBeDefined();
    expect(within(own).queryByRole("button")).toBeNull();
    expect(
      within(rowOf("Beto Ruiz")).getByRole("button", {
        name: "Hacer administrador a @betoruiz",
      }),
    ).toBeDefined();
    expect(screen.getAllByText("(tú)")).toHaveLength(1);
  });

  it("offers Quitar administrador on other administrators", async () => {
    stubApi(session, () => jsonResponse(200, makeAdminPage([me, carla])));
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Quitar administrador a @carla" }),
    ).toBeDefined();
  });

  it("shows the range and the pagination", async () => {
    stubApi(session, (method, url) =>
      method === "GET" && url.startsWith(LIST)
        ? jsonResponse(
            200,
            makeAdminPage([beto], { total: 45, pagina: 2, totalPaginas: 3 }),
          )
        : undefined,
    );
    renderPage("/admin/usuarios?pagina=2");

    expect(await screen.findByText("Mostrando 21–40 de 45")).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeDefined();
  });

  it("shows the empty text", async () => {
    stubApi(session, (method, url) =>
      method === "GET" && url.startsWith(LIST)
        ? jsonResponse(200, makeAdminPage<AdminUser>([]))
        : undefined,
    );
    renderPage();

    expect(
      await screen.findByText("No hay usuarios que coincidan con los filtros."),
    ).toBeDefined();
  });

  it("shows the error with Reintentar", async () => {
    let fail = true;
    const calls = stubApi(session, (method, url) =>
      method === "GET" && url.startsWith(LIST)
        ? fail
          ? jsonResponse(500, { message: "No se pudieron cargar los usuarios." })
          : jsonResponse(200, makeAdminPage([beto]))
        : undefined,
    );
    renderPage();

    expect(
      await screen.findByText("No se pudieron cargar los usuarios."),
    ).toBeDefined();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Beto Ruiz")).toBeDefined();
    expect(listCalls(calls)).toHaveLength(2);
  });
});

describe("AdminUsersPage / filtros en la URL", () => {
  it("restores the filters from the URL and sends them to the API", async () => {
    const calls = stubApi(session, (method, url) =>
      method === "GET" && url.startsWith(LIST)
        ? jsonResponse(200, makeAdminPage([carla]))
        : undefined,
    );
    renderPage("/admin/usuarios?q=carla&rol=admin&pagina=2");

    await screen.findByText("Carla Soto");
    expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("carla");
    expect((screen.getByLabelText("Rol") as HTMLSelectElement).value).toBe("admin");
    expect(listCalls(calls)[0]?.url).toBe(`${LIST}?q=carla&rol=admin&pagina=2`);
  });

  it("offers Todos, Administradores and Usuarios and writes the role to the URL", async () => {
    const calls = stubApi(session, (method, url) =>
      method === "GET" && url.startsWith(LIST)
        ? jsonResponse(200, makeAdminPage([beto], { pagina: 2, totalPaginas: 3, total: 45 }))
        : undefined,
    );
    renderPage("/admin/usuarios?pagina=2");
    await screen.findByText("Beto Ruiz");

    const select = screen.getByLabelText("Rol") as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual([
      "Todos",
      "Administradores",
      "Usuarios",
    ]);
    fireEvent.change(select, { target: { value: "user" } });

    await waitFor(() => expect(search()).toBe("?rol=user"));
    await waitFor(() => expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?rol=user`));
  });

  it("typing in the search box updates the URL after a pause", async () => {
    const calls = stubApi(session, (method, url) =>
      method === "GET" && url.startsWith(LIST)
        ? jsonResponse(200, makeAdminPage([beto]))
        : undefined,
    );
    renderPage();
    await screen.findByText("Beto Ruiz");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "pérez" } });

    await waitFor(() => expect(search()).toBe("?q=p%C3%A9rez"), { timeout: 2000 });
    await waitFor(() =>
      expect(listCalls(calls).at(-1)?.url).toBe(`${LIST}?q=p%C3%A9rez`),
    );
  });
});

describe("AdminUsersPage / cambiar rol", () => {
  function stubUsers() {
    return stubApi(session, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return jsonResponse(200, makeAdminPage([me, beto, carla]));
      }
      return undefined;
    });
  }

  it("asks for confirmation with the texts of the spec, grants the role and shows the notice", async () => {
    const calls = stubApi(session, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return jsonResponse(200, makeAdminPage([me, beto, carla]));
      }
      if (method === "PATCH" && url === `${LIST}/${beto.id}/role`) {
        return jsonResponse(200, { ...beto, role: "admin" });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Hacer administrador a @betoruiz" }),
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("¿Hacer administrador a @betoruiz?")).toBeDefined();
    expect(
      within(dialog).getByText(
        "Podrá destacar y eliminar cualquier producto, moderar reseñas y cambiar el rol de otros usuarios.",
      ),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hacer administrador" }));

    expect(await screen.findByText("@betoruiz ahora es administrador.")).toBeDefined();
    expect(screen.getByRole("status").textContent).toContain("✓ ok");
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.body).toEqual({ role: "admin" });
    const row = rowOf("Beto Ruiz");
    expect(within(row).getByText("Administrador")).toBeDefined();
    expect(
      within(row).getByRole("button", { name: "Quitar administrador a @betoruiz" }),
    ).toBeDefined();
  });

  it("removes the role after confirming and shows the notice", async () => {
    const calls = stubApi(session, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return jsonResponse(200, makeAdminPage([me, carla]));
      }
      if (method === "PATCH") {
        return jsonResponse(200, { ...carla, role: "user" });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Quitar administrador a @carla" }),
    );

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("¿Quitar el rol de administrador a @carla?"),
    ).toBeDefined();
    expect(
      within(dialog).getByText("Volverá a ser un usuario normal y dejará de ver este panel."),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Quitar administrador" }));

    expect(await screen.findByText("@carla ahora es usuario.")).toBeDefined();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ role: "user" });
    expect(within(rowOf("Carla Soto")).getByText("Usuario")).toBeDefined();
  });

  it("does not change anything when the dialog is cancelled", async () => {
    const calls = stubUsers();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Hacer administrador a @betoruiz" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
    expect(within(rowOf("Beto Ruiz")).getByText("Usuario")).toBeDefined();
  });

  it("shows the API error and keeps the row when it fails", async () => {
    stubApi(session, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return jsonResponse(200, makeAdminPage([me, beto]));
      }
      if (method === "PATCH") {
        return jsonResponse(403, { message: "No puedes cambiar tu propio rol." });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Hacer administrador a @betoruiz" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hacer administrador" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText("No puedes cambiar tu propio rol.")).toBeDefined();
    expect(within(rowOf("Beto Ruiz")).getByText("Usuario")).toBeDefined();
  });

  it("reloads the list on a 404", async () => {
    const calls = stubApi(session, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return jsonResponse(200, makeAdminPage([me, beto]));
      }
      if (method === "PATCH") {
        return jsonResponse(404, { message: "Usuario no encontrado." });
      }
      return undefined;
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Hacer administrador a @betoruiz" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hacer administrador" }));

    expect(await screen.findByText("Usuario no encontrado.")).toBeDefined();
    await waitFor(() => expect(listCalls(calls)).toHaveLength(2));
  });

  it("reloads the list when changing a role under a role filter", async () => {
    const calls = stubApi(session, (method, url) => {
      if (method === "GET" && url.startsWith(LIST)) {
        return jsonResponse(200, makeAdminPage([beto]));
      }
      if (method === "PATCH") {
        return jsonResponse(200, { ...beto, role: "admin" });
      }
      return undefined;
    });
    renderPage("/admin/usuarios?rol=user");

    fireEvent.click(
      await screen.findByRole("button", { name: "Hacer administrador a @betoruiz" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hacer administrador" }));

    await screen.findByText("@betoruiz ahora es administrador.");
    await waitFor(() => expect(listCalls(calls)).toHaveLength(2));
  });
});
