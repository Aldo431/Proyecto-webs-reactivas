import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeReview } from "../logic/reviewFixtures.ts";
import { ReviewCard } from "./ReviewCard.tsx";

function renderCard(
  props: Partial<React.ComponentProps<typeof ReviewCard>> = {},
) {
  return render(
    <ul>
      <ReviewCard
        review={makeReview()}
        isOwn={false}
        onEdit={() => {}}
        onDelete={() => Promise.resolve()}
        {...props}
      />
    </ul>,
  );
}

describe("ReviewCard", () => {
  it("shows the author, rating and comment", () => {
    renderCard({ review: makeReview({ rating: 5, comment: "Excelente." }) });
    expect(screen.getByText("Ana Pérez")).toBeDefined();
    expect(screen.getByText("Excelente.")).toBeDefined();
    expect(
      screen.getByRole("img", { name: "5 de 5 estrellas" }),
    ).toBeDefined();
  });

  it("renders HTML in the comment as literal text", () => {
    renderCard({ review: makeReview({ comment: "<script>alert(1)</script>" }) });
    expect(
      screen.getByText("<script>alert(1)</script>"),
    ).toBeDefined();
  });

  it("shows the owner controls only for own reviews", () => {
    const { unmount } = renderCard({ isOwn: true });
    expect(screen.getByText("Tu reseña")).toBeDefined();
    expect(screen.getByRole("button", { name: "Editar" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Borrar tu reseña" })).toBeDefined();
    unmount();

    renderCard({ isOwn: false });
    expect(screen.queryByText("Tu reseña")).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("asks for confirmation before deleting", () => {
    const onDelete = vi.fn(() => Promise.resolve());
    renderCard({ isOwn: true, onDelete });
    fireEvent.click(screen.getByRole("button", { name: "Borrar tu reseña" }));
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
