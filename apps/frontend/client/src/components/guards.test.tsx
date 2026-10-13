import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext.tsx";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { OnlyAnonymousRoute } from "./OnlyAnonymousRoute.tsx";
import { OnlyAuthenticatedRoute } from "./OnlyAuthenticatedRoute.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

function renderGuards(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/privada"
            element={
              <OnlyAuthenticatedRoute>
                <p>Contenido privado</p>
              </OnlyAuthenticatedRoute>
            }
          />
          <Route
            path="/registro"
            element={
              <OnlyAnonymousRoute>
                <p>Contenido anónimo</p>
              </OnlyAnonymousRoute>
            }
          />
          <Route path="/iniciar-sesion" element={<p>Login (sonda)</p>} />
          <Route path="/" element={<p>Inicio (sonda)</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OnlyAuthenticatedRoute", () => {
  it("renders nothing while the session is loading", () => {
    stubAuthFetch({ "/api/auth/me": () => new Promise<Response>(() => {}) });
    const { container } = renderGuards("/privada");
    expect(container.textContent).toBe("");
  });

  it("sends anonymous visitors to login", async () => {
    stubAuthFetch();
    renderGuards("/privada");
    expect(await screen.findByText("Login (sonda)")).toBeDefined();
    expect(screen.queryByText("Contenido privado")).toBeNull();
  });

  it("renders the children when authenticated", async () => {
    stubAuthFetch({ "/api/auth/me": () => jsonResponse(200, okUser) });
    renderGuards("/privada");
    expect(await screen.findByText("Contenido privado")).toBeDefined();
  });
});

describe("OnlyAnonymousRoute", () => {
  it("renders nothing while the session is loading", () => {
    stubAuthFetch({ "/api/auth/me": () => new Promise<Response>(() => {}) });
    const { container } = renderGuards("/registro");
    expect(container.textContent).toBe("");
  });

  it("renders the children for anonymous visitors", async () => {
    stubAuthFetch();
    renderGuards("/registro");
    expect(await screen.findByText("Contenido anónimo")).toBeDefined();
  });

  it("sends authenticated users home", async () => {
    stubAuthFetch({ "/api/auth/me": () => jsonResponse(200, okUser) });
    renderGuards("/registro");
    expect(await screen.findByText("Inicio (sonda)")).toBeDefined();
  });
});
