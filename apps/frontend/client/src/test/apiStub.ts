import { vi } from "vitest";
import { jsonResponse } from "./authMocks.ts";

export interface RecordedCall {
  method: string;
  url: string;
  body: unknown;
}

type Handler = (
  method: string,
  url: string,
) => Response | Promise<Response> | undefined;

// Stubs `fetch` answering by method + URL. `handler` has priority; the
// session is `user` (or anonymous when null) and any other request, such as
// the favorites lookup of a product card, answers 401. Every call is recorded.
export function stubApi(
  user: object | null,
  handler: Handler,
): RecordedCall[] {
  const calls: RecordedCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const url = String(input);
      const rawBody = init?.body;
      calls.push({
        method,
        url,
        body: typeof rawBody === "string" ? JSON.parse(rawBody) : undefined,
      });
      const handled = handler(method, url);
      if (handled !== undefined) {
        return handled;
      }
      if (url === "/api/auth/me") {
        return user === null
          ? jsonResponse(401, { message: "Debes iniciar sesión." })
          : jsonResponse(200, user);
      }
      return jsonResponse(401, { message: "Debes iniciar sesión." });
    }),
  );
  return calls;
}

export const testUser = {
  id: "6713b0c2a1f4e9d2c8b70a99",
  username: "tiendadcc",
  displayName: "TiendaDCC",
  email: "tienda@dcc.uchile.cl",
};
