import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { OnlyAdminRoute } from "./OnlyAdminRoute.tsx";
import { OnlyAnonymousRoute } from "./OnlyAnonymousRoute.tsx";
import { OnlyAuthenticatedRoute } from "./OnlyAuthenticatedRoute.tsx";
import { SessionSync } from "./SessionSync.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "user",
};

const adminUser = { ...okUser, role: "admin" };

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "";
  return <p>{`Login (sonda) desde ${from}`}</p>;
}

function renderGuards(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionSync>
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
          <Route
            path="/admin"
            element={
              <OnlyAdminRoute>
                <p>Contenido admin</p>
              </OnlyAdminRoute>
            }
          />
          <Route path="/iniciar-sesion" element={<LoginProbe />} />
          <Route path="/" element={<p>Inicio (sonda)</p>} />
        </Routes>
      </SessionSync>
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
    expect(await screen.findByText(/Login \(sonda\)/)).toBeDefined();
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

describe("OnlyAdminRoute", () => {
  it("renders nothing while the session is loading", () => {
    stubAuthFetch({ "/api/auth/me": () => new Promise<Response>(() => {}) });
    const { container } = renderGuards("/admin");
    expect(container.textContent).toBe("");
  });

  it("sends anonymous visitors to login keeping state.from", async () => {
    stubAuthFetch();
    renderGuards("/admin");
    expect(await screen.findByText("Login (sonda) desde /admin")).toBeDefined();
    expect(screen.queryByText("Contenido admin")).toBeNull();
  });

  it("sends regular users home", async () => {
    stubAuthFetch({ "/api/auth/me": () => jsonResponse(200, okUser) });
    renderGuards("/admin");
    expect(await screen.findByText("Inicio (sonda)")).toBeDefined();
    expect(screen.queryByText("Contenido admin")).toBeNull();
  });

  it("renders the children for an admin", async () => {
    stubAuthFetch({ "/api/auth/me": () => jsonResponse(200, adminUser) });
    renderGuards("/admin");
    expect(await screen.findByText("Contenido admin")).toBeDefined();
  });
});
