import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionSync } from "../components/SessionSync.tsx";
import { INITIAL_AUTH_STATE, useAuth, useAuthStore } from "./authStore.ts";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
  role: "user",
};

const anonymousJson = { message: "Debes iniciar sesión." };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetchWithRoutes(
  routes: Record<string, () => Response | Promise<Response>>,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const handler = routes[url];
      if (!handler) {
        throw new Error(`Sin respuesta simulada para ${url}`);
      }
      return handler();
    }),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return <SessionSync>{children}</SessionSync>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAuth / authStore + SessionSync", () => {
  it("va de loading a authenticated al restaurar la sesión", async () => {
    stubFetchWithRoutes({
      "/api/auth/me": () => json(200, okUser),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.state).toEqual({ status: "loading", user: null });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "authenticated",
        user: okUser,
      });
    });
  });

  it("va de loading a anonymous si no hay sesión", async () => {
    stubFetchWithRoutes({
      "/api/auth/me": () => json(401, anonymousJson),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.state).toEqual({ status: "loading", user: null });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "anonymous",
        user: null,
      });
    });
  });

  it("login autentica la sesión y logout la deja anónima", async () => {
    const routes: Record<string, () => Response> = {
      "/api/auth/me": () => json(401, anonymousJson),
    };
    stubFetchWithRoutes(routes);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.status).toBe("anonymous");
    });

    routes["/api/auth/login"] = () => json(200, okUser);
    await act(async () => {
      await result.current.login({
        email: "ana@dcc.uchile.cl",
        password: "secreto123",
      });
    });
    expect(result.current.state).toEqual({
      status: "authenticated",
      user: okUser,
    });
    expect(result.current.user).toEqual(okUser);

    routes["/api/auth/logout"] = () => new Response(null, { status: 204 });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.state).toEqual({
      status: "anonymous",
      user: null,
    });
  });

  it("un login fallido no cambia el estado anónimo", async () => {
    const routes: Record<string, () => Response> = {
      "/api/auth/me": () => json(401, anonymousJson),
    };
    stubFetchWithRoutes(routes);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.status).toBe("anonymous");
    });

    routes["/api/auth/login"] = () =>
      json(401, { message: "Correo o contraseña incorrectos." });
    await act(async () => {
      const loginResult = await result.current.login({
        email: "ana@dcc.uchile.cl",
        password: "incorrecta",
      });
      expect(loginResult.ok).toBe(false);
    });

    expect(result.current.state.status).toBe("anonymous");
  });

  it("refresh actualiza el estado tras restaurar", async () => {
    const routes: Record<string, () => Response> = {
      "/api/auth/me": () => json(401, anonymousJson),
    };
    stubFetchWithRoutes(routes);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.status).toBe("anonymous");
    });

    routes["/api/auth/me"] = () => json(200, okUser);
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.state).toEqual({
      status: "authenticated",
      user: okUser,
    });
  });
});
describe("authStore fuera de React", () => {
  it("parte en loading y refresh lo resuelve sin montar componentes", async () => {
    stubFetchWithRoutes({
      "/api/auth/me": () => json(200, okUser),
    });

    expect(useAuthStore.getState().state).toEqual(INITIAL_AUTH_STATE);

    await useAuthStore.getState().refresh();

    expect(useAuthStore.getState().state).toEqual({
      status: "authenticated",
      user: okUser,
    });
  });

  it("register autentica con el usuario creado", async () => {
    stubFetchWithRoutes({
      "/api/auth/register": () => json(201, okUser),
    });

    const result = await useAuthStore.getState().register({
      username: "anaperez",
      displayName: "Ana Pérez",
      email: "ana@dcc.uchile.cl",
      password: "secreto123",
      passwordConfirm: "secreto123",
    });

    expect(result.ok).toBe(true);
    expect(useAuthStore.getState().state).toEqual({
      status: "authenticated",
      user: okUser,
    });
  });

  it("logout deja la sesión anónima aunque estuviera autenticada", async () => {
    useAuthStore.setState({
      state: { status: "authenticated", user: { ...okUser, role: "user" } },
    });
    stubFetchWithRoutes({
      "/api/auth/logout": () => new Response(null, { status: 204 }),
    });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().state).toEqual({
      status: "anonymous",
      user: null,
    });
  });
});
