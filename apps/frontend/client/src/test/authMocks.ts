import { vi } from "vitest";

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export type FetchRoutes = Record<string, () => Response | Promise<Response>>;

// Stubs `fetch` with a URL → response map. By default the session is
// anonymous (`GET /api/auth/me` → 401), so the AuthBar renders its visitor
// accesses. Tests mutate the returned map to script other responses.
export function stubAuthFetch(initialRoutes: FetchRoutes = {}): FetchRoutes {
  const routes: FetchRoutes = {
    "/api/auth/me": () =>
      jsonResponse(401, { message: "Debes iniciar sesión." }),
    ...initialRoutes,
  };

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

  return routes;
}
