import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../test/authMocks.ts";
import {
  createReview,
  deleteReview,
  fetchReviews,
  updateReview,
} from "./reviewApi.ts";
import { makeReview } from "./reviewFixtures.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

type Handler = (url: string, init: RequestInit | undefined) => Response;

function stubFetch(handler: Handler) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init)),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function stubNetworkFailure() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
  );
}

const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Inténtalo de nuevo.";
const UNEXPECTED_MESSAGE = "El servidor devolvió una respuesta inesperada.";

const review = makeReview();
const exampleList = { reviews: [review], total: 1, promedioRating: 4 };

describe("fetchReviews", () => {
  it("returns the validated list with credentials", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, exampleList));

    const result = await fetchReviews("taza-dcc");

    expect(result).toEqual({ ok: true, list: exampleList });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/products/taza-dcc/reviews");
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("include");
  });

  it("flags a 404 product as notFound", async () => {
    stubFetch(() => jsonResponse(404, { message: "Producto no encontrado." }));

    expect(await fetchReviews("nada")).toEqual({
      ok: false,
      message: "Producto no encontrado.",
      notFound: true,
    });
  });

  it("rejects an unexpected body", async () => {
    stubFetch(() => jsonResponse(200, { reviews: "nope" }));

    expect(await fetchReviews("taza-dcc")).toEqual({
      ok: false,
      message: UNEXPECTED_MESSAGE,
    });
  });

  it("translates a network failure", async () => {
    stubNetworkFailure();

    expect(await fetchReviews("taza-dcc")).toEqual({
      ok: false,
      message: NETWORK_MESSAGE,
    });
  });
});

describe("createReview", () => {
  const input = { rating: 5, comment: "Excelente producto." };

  it("posts the input as JSON and returns the review on 201", async () => {
    const fetchMock = stubFetch(() => jsonResponse(201, review));

    const result = await createReview("taza-dcc", input);

    expect(result).toEqual({ ok: true, review });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("/api/products/taza-dcc/reviews");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it("returns fieldErrors on 400", async () => {
    stubFetch(() =>
      jsonResponse(400, {
        message: "Revisa los datos ingresados.",
        fieldErrors: { comment: "El comentario es obligatorio." },
      }),
    );

    expect(await createReview("taza-dcc", { rating: 5, comment: "" })).toEqual({
      ok: false,
      message: "Revisa los datos ingresados.",
      fieldErrors: { comment: "El comentario es obligatorio." },
    });
  });

  it("translates 401, 409 and network failures", async () => {
    stubFetch(() => jsonResponse(401, { message: "Debes iniciar sesión." }));
    const unauthorized = await createReview("taza-dcc", input);
    stubFetch(() =>
      jsonResponse(409, { message: "Ya has reseñado este producto." }),
    );
    const conflict = await createReview("taza-dcc", input);
    stubNetworkFailure();
    const offline = await createReview("taza-dcc", input);

    expect(unauthorized).toEqual({
      ok: false,
      message: "Debes iniciar sesión.",
    });
    expect(conflict).toEqual({
      ok: false,
      message: "Ya has reseñado este producto.",
    });
    expect(offline).toEqual({ ok: false, message: NETWORK_MESSAGE });
  });

  it("does not treat a 200 as a creation", async () => {
    stubFetch(() => jsonResponse(200, review));

    expect((await createReview("taza-dcc", input)).ok).toBe(false);
  });
});

describe("updateReview", () => {
  it("puts only the given fields", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, review));

    const result = await updateReview(review.id, { rating: 2 });

    expect(result).toEqual({ ok: true, review });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(`/api/reviews/${review.id}`);
    expect(init?.method).toBe("PUT");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual({ rating: 2 });
  });

  it("translates 403 using the server message", async () => {
    stubFetch(() =>
      jsonResponse(403, {
        message: "No puedes modificar una reseña de otro usuario.",
      }),
    );

    expect(await updateReview(review.id, { rating: 1 })).toEqual({
      ok: false,
      message: "No puedes modificar una reseña de otro usuario.",
    });
  });

  it("flags 404 as notFound", async () => {
    stubFetch(() => jsonResponse(404, { message: "Reseña no encontrada." }));

    expect(await updateReview(review.id, { rating: 1 })).toEqual({
      ok: false,
      message: "Reseña no encontrada.",
      notFound: true,
    });
  });
});

describe("deleteReview", () => {
  it("resolves ok on 204", async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }));

    expect(await deleteReview(review.id)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(`/api/reviews/${review.id}`);
    expect(init?.method).toBe("DELETE");
    expect(init?.credentials).toBe("include");
  });

  it("translates 403, 404 and network failures", async () => {
    stubFetch(() => new Response("", { status: 403 }));
    const forbidden = await deleteReview(review.id);
    stubFetch(() => new Response("", { status: 404 }));
    const missing = await deleteReview(review.id);
    stubNetworkFailure();
    const offline = await deleteReview(review.id);

    expect(forbidden).toEqual({
      ok: false,
      message: "No tienes permiso para realizar esta acción.",
    });
    expect(missing).toMatchObject({ ok: false, notFound: true });
    expect(offline).toEqual({ ok: false, message: NETWORK_MESSAGE });
  });
});
