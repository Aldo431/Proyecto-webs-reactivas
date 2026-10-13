import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App.tsx";
import { AuthProvider } from "../context/AuthContext.tsx";
import { CartProvider } from "../context/CartContext.tsx";
import { ProfilePage } from "./ProfilePage.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  name: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

const baseProfile = {
  id: okUser.id,
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  emailVerified: false,
  favorites: ["taza-dcc"],
  history: [
    { productId: "polera-dcc", viewedAt: "2026-10-13T10:00:00.000Z" },
  ],
  cart: [],
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface FetchCall {
  method: string;
  url: string;
  body: unknown;
}

let fetchCalls: FetchCall[];

function stubProfileFetch(
  profileHandler: () => Response,
  putHandler: (body: unknown) => Response,
  deleteHandler: () => Response = () => json(200, []),
) {
  fetchCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      let body: unknown = null;
      try {
        body = init?.body ? JSON.parse(init.body as string) : null;
      } catch {
        body = null;
      }
      fetchCalls.push({ method, url, body });
      if (url === "/api/auth/me") {
        return json(200, okUser);
      }
      if (url === "/api/users/me" && method === "GET") {
        return profileHandler();
      }
      if (url === "/api/users/me" && method === "PUT") {
        return putHandler(body);
      }
      if (url.startsWith("/api/users/me/favorites") && method === "DELETE") {
        return deleteHandler();
      }
      throw new Error(`Sin respuesta simulada para ${method} ${url}`);
    }),
  );
}

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={["/perfil"]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/catalogo" element={<p>Catálogo (sonda)</p>} />
            <Route
              path="/producto/:id"
              element={<p>Detalle (sonda)</p>}
            />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function field(name: string): HTMLInputElement {
  return screen.getByLabelText(name) as HTMLInputElement;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ProfilePage", () => {
  it("muestra datos, estado, favoritos, historial y resumen del carrito", async () => {
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(200, baseProfile),
    );

    renderProfile();

    expect(
      await screen.findByRole("heading", { name: "Mi perfil" }),
    ).toBeDefined();
    expect(screen.getByText("anaperez")).toBeDefined();
    expect(screen.getByText("Ana Pérez")).toBeDefined();
    expect(screen.getByText("ana@dcc.uchile.cl")).toBeDefined();
    expect(screen.getByText("Pendiente de verificación")).toBeDefined();
    expect(screen.getByText("Taza DCC")).toBeDefined();
    expect(screen.getByText("Polera DCC")).toBeDefined();
    expect(screen.getByText("Tu carrito está vacío.")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Editar perfil" }),
    ).toBeDefined();
  });

  it("edita con valores pre-rellenados y refleja el éxito", async () => {
    const updated = {
      ...baseProfile,
      username: "anap",
      displayName: "Ana P.",
    };
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(200, updated),
    );

    renderProfile();
    fireEvent.click(
      await screen.findByRole("button", { name: "Editar perfil" }),
    );

    expect(field("Nombre de usuario").value).toBe("anaperez");
    expect(field("Nombre a mostrar").value).toBe("Ana Pérez");
    expect(field("Correo electrónico").value).toBe("ana@dcc.uchile.cl");

    fireEvent.change(field("Nombre de usuario"), {
      target: { value: "anap" },
    });
    fireEvent.change(field("Nombre a mostrar"), { target: { value: "Ana P." } });
    fireEvent.change(field("Contraseña actual"), {
      target: { value: "secreto123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await screen.findByText("Perfil actualizado correctamente."),
    ).toBeDefined();
    expect(screen.getByText("anap")).toBeDefined();
    expect(screen.getByText("Ana P.")).toBeDefined();

    const puts = fetchCalls.filter(
      (call) => call.url === "/api/users/me" && call.method === "PUT",
    );
    expect(puts).toHaveLength(1);
    expect(puts[0]?.body).toEqual({
      username: "anap",
      displayName: "Ana P.",
      email: "ana@dcc.uchile.cl",
      currentPassword: "secreto123",
    });
  });

  it("valida localmente sin enviar la petición", async () => {
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(200, baseProfile),
    );

    renderProfile();
    fireEvent.click(
      await screen.findByRole("button", { name: "Editar perfil" }),
    );

    fireEvent.change(field("Nombre a mostrar"), { target: { value: "   " } });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await screen.findByText("El nombre a mostrar es obligatorio."),
    ).toBeDefined();
    expect(
      fetchCalls.filter(
        (call) => call.url === "/api/users/me" && call.method === "PUT",
      ),
    ).toHaveLength(0);
  });

  it("muestra el error del servidor sin perder los datos", async () => {
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(401, { message: "La contraseña actual es incorrecta." }),
    );

    renderProfile();
    fireEvent.click(
      await screen.findByRole("button", { name: "Editar perfil" }),
    );

    fireEvent.change(field("Nombre a mostrar"), { target: { value: "Ana P." } });
    fireEvent.change(field("Contraseña actual"), {
      target: { value: "otra" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await screen.findByText("La contraseña actual es incorrecta."),
    ).toBeDefined();
    expect(field("Nombre a mostrar").value).toBe("Ana P.");
  });

  it("muestra el 409 de username sin perder los datos", async () => {
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(409, { message: "Ese nombre de usuario ya está en uso." }),
    );

    renderProfile();
    fireEvent.click(
      await screen.findByRole("button", { name: "Editar perfil" }),
    );

    fireEvent.change(field("Nombre de usuario"), { target: { value: "otro" } });
    fireEvent.change(field("Contraseña actual"), {
      target: { value: "secreto123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    expect(
      await screen.findByText("Ese nombre de usuario ya está en uso."),
    ).toBeDefined();
    expect(field("Nombre de usuario").value).toBe("otro");
  });

  it("cancela sin enviar ni conservar cambios", async () => {
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(200, baseProfile),
    );

    renderProfile();
    fireEvent.click(
      await screen.findByRole("button", { name: "Editar perfil" }),
    );

    fireEvent.change(field("Nombre a mostrar"), { target: { value: "Ana P." } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("Ana Pérez")).toBeDefined();
    expect(
      fetchCalls.filter(
        (call) => call.url === "/api/users/me" && call.method === "PUT",
      ),
    ).toHaveLength(0);
  });

  it("muestra error con reintento si la carga falla", async () => {
    let attempts = 0;
    stubProfileFetch(
      () => {
        attempts += 1;
        return attempts === 1
          ? json(500, {})
          : json(200, baseProfile);
      },
      () => json(200, baseProfile),
    );

    renderProfile();

    expect(
      await screen.findByRole("button", { name: "Reintentar" }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { name: "Mi perfil" }),
    ).toBeDefined();
    expect(await screen.findByText("Ana Pérez")).toBeDefined();
  });

  it("carga el historial por lotes con fecha en español", async () => {
    const history = Array.from({ length: 12 }, (_, index) => ({
      productId: ["taza-dcc", "polera-dcc", "sticker-dcc"][index % 3] as string,
      viewedAt: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));
    stubProfileFetch(
      () => json(200, { ...baseProfile, history }),
      () => json(200, baseProfile),
    );

    renderProfile();

    const firstBatch = await screen.findAllByText(/Visto el/);
    expect(firstBatch).toHaveLength(10);
    expect(
      screen
        .getByRole("button", { name: "Ver visitas más recientes" })
        .getAttribute("disabled"),
    ).not.toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver visitas más antiguas" }),
    );
    expect(
      screen.getByRole("button", { name: "Cargar anteriores" }),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Cargar anteriores" }),
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Visto el/)).toHaveLength(12);
      expect(
        screen.queryByRole("button", { name: "Cargar anteriores" }),
      ).toBeNull();
    });
  });

  it("pagina las favoritas de 12 en 12", async () => {
    const favorites = Array.from(
      { length: 13 },
      (_, index) =>
        ["taza-dcc", "polera-dcc", "sticker-dcc"][index % 3] as string,
    );
    stubProfileFetch(
      () => json(200, { ...baseProfile, favorites }),
      () => json(200, baseProfile),
    );

    renderProfile();

    expect(await screen.findByText("Página 1 de 2")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Página siguiente de favoritos" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Página 2 de 2")).toBeDefined();
    });
  });

  it("elimina un favorito del perfil y lo refleja", async () => {
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(200, baseProfile),
    );

    renderProfile();

    const removeButton = await screen.findByRole("button", {
      name: "Eliminar Taza DCC de favoritos",
    });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText("Taza DCC")).toBeNull();
    });
  });

  it("mueve el foco a la sección de favoritos al llegar desde el encabezado", async () => {
    stubProfileFetch(
      () => json(200, baseProfile),
      () => json(200, baseProfile),
    );

    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/perfil", state: { section: "favoritos" } }]}
      >
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/catalogo" element={<p>Catálogo (sonda)</p>} />
              <Route path="/producto/:id" element={<p>Detalle (sonda)</p>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    await screen.findByText("Taza DCC");

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("perfil-favoritos");
    });
  });
});

describe("Ruta /perfil", () => {
  it("redirige al inicio de sesión si no hay sesión", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/auth/me") {
          return json(401, { message: "Debes iniciar sesión." });
        }
        throw new Error(`Sin respuesta simulada para ${String(input)}`);
      }),
    );

    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Iniciar sesión" }),
    ).toBeDefined();
  });
});
