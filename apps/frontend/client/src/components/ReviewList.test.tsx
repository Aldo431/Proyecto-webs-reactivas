import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Review, ReviewList as ReviewListData } from "@tiendadcc/utils";
import { AuthProvider } from "../context/AuthContext.tsx";
import { makeReview } from "../logic/reviewFixtures.ts";
import type { ReviewApi } from "../logic/useReviews.ts";
import { jsonResponse, stubAuthFetch } from "../test/authMocks.ts";
import { ReviewList } from "./ReviewList.tsx";

const okUser = {
  id: "6712a4f3c9b1e24a8f0d1234",
  username: "anaperez",
  displayName: "Ana Pérez",
  email: "ana@dcc.uchile.cl",
};

const ownAuthor = {
  id: okUser.id,
  username: okUser.username,
  displayName: okUser.displayName,
};

const emptyList: ReviewListData = {
  reviews: [],
  total: 0,
  promedioRating: null,
};

function listWith(reviews: Review[]): ReviewListData {
  return { reviews, total: reviews.length, promedioRating: null };
}

function makeApi(overrides: Partial<ReviewApi> = {}): ReviewApi {
  return {
    fetchReviews: () => Promise.resolve({ ok: true, list: emptyList }),
    createReview: () => Promise.resolve({ ok: true, review: makeReview() }),
    updateReview: () => Promise.resolve({ ok: true, review: makeReview() }),
    deleteReview: () => Promise.resolve({ ok: true }),
    ...overrides,
  };
}

function renderReviews(api: ReviewApi, authenticated = false) {
  if (authenticated) {
    stubAuthFetch({ "/api/auth/me": () => jsonResponse(200, okUser) });
  } else {
    stubAuthFetch();
  }
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ReviewList productId="p1" api={api} />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  stubAuthFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ReviewList", () => {
  it("shows a loading state first", () => {
    renderReviews(makeApi());
    expect(screen.getByText("Cargando reseñas…").getAttribute("role")).toBe(
      "status",
    );
  });

  it("shows the empty state and invites anonymous users to sign in", async () => {
    renderReviews(makeApi());
    expect(
      await screen.findByText("Sé el primero en reseñar este producto."),
    ).toBeDefined();
    expect(
      await screen.findByRole("link", { name: "Inicia sesión" }),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Escribir reseña" })).toBeNull();
  });

  it("lets an authenticated user open the form", async () => {
    renderReviews(makeApi(), true);
    fireEvent.click(
      await screen.findByRole("button", { name: "Escribir reseña" }),
    );
    expect(
      screen.getByRole("group", { name: "Tu calificación" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Publicar reseña" }),
    ).toBeDefined();
  });

  it("marks the own review with edit and delete controls", async () => {
    const own = makeReview({ author: { ...ownAuthor }, comment: "La mía." });
    renderReviews(makeApi({ fetchReviews: () => Promise.resolve({ ok: true, list: listWith([own]) }) }), true);
    expect(await screen.findByText("Tu reseña")).toBeDefined();
    expect(screen.getByRole("button", { name: "Editar" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Borrar tu reseña" }),
    ).toBeDefined();
  });

  it("shows the error state and retries", async () => {
    let attempt = 0;
    const api = makeApi({
      fetchReviews: () => {
        attempt += 1;
        return Promise.resolve(
          attempt === 1
            ? { ok: false, message: "No se pudieron cargar las reseñas." }
            : { ok: true, list: emptyList },
        );
      },
    });
    renderReviews(api);
    expect(await screen.findByRole("alert")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByText("Sé el primero en reseñar este producto."),
    ).toBeDefined();
  });

  it("publishes a review and reloads the list", async () => {
    const own = makeReview({ author: { ...ownAuthor }, comment: "Recién publicada." });
    const createReview = vi.fn(() =>
      Promise.resolve({ ok: true as const, review: own }),
    );
    let calls = 0;
    const api = makeApi({
      fetchReviews: () => {
        calls += 1;
        return Promise.resolve({
          ok: true,
          list: calls === 1 ? emptyList : listWith([own]),
        });
      },
      createReview,
    });
    renderReviews(api, true);

    fireEvent.click(
      await screen.findByRole("button", { name: "Escribir reseña" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "4 de 5 estrellas" }));
    fireEvent.change(screen.getByLabelText("Comentario"), {
      target: { value: "Recién publicada." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar reseña" }));

    await waitFor(() => expect(createReview).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Tu reseña")).toBeDefined();
  });
});
