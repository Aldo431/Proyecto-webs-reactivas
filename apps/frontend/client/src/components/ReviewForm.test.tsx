import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeReview } from "../logic/reviewFixtures.ts";
import { ReviewForm } from "./ReviewForm.tsx";

describe("ReviewForm", () => {
  it("renders the rating group and the comment field", () => {
    render(<ReviewForm onSubmit={() => {}} submitting={false} />);
    expect(
      screen.getByRole("group", { name: "Tu calificación" }),
    ).toBeDefined();
    expect(screen.getByLabelText("Comentario")).toBeDefined();
  });

  it("shows accessible errors when submitting without data", () => {
    render(<ReviewForm onSubmit={() => {}} submitting={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Publicar reseña" }));
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.getByText("El comentario es obligatorio.")).toBeDefined();
  });

  it("calls onSubmit with the parsed input when valid", () => {
    const onSubmit = vi.fn();
    render(<ReviewForm onSubmit={onSubmit} submitting={false} />);
    fireEvent.click(screen.getByRole("radio", { name: "4 de 5 estrellas" }));
    fireEvent.change(screen.getByLabelText("Comentario"), {
      target: { value: "Muy buena taza." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publicar reseña" }));
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      comment: "Muy buena taza.",
    });
  });

  it("preloads the review and edits it", () => {
    const review = makeReview({ rating: 3, comment: "Está bien." });
    const onSubmit = vi.fn();
    render(
      <ReviewForm initial={review} onSubmit={onSubmit} submitting={false} />,
    );
    const checked = screen.getByRole("radio", {
      name: "3 de 5 estrellas",
    }) as HTMLInputElement;
    expect(checked.checked).toBe(true);
    expect((screen.getByLabelText("Comentario") as HTMLTextAreaElement).value).toBe(
      "Está bien.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 3,
      comment: "Está bien.",
    });
  });

  it("disables the submit button while submitting", () => {
    render(<ReviewForm onSubmit={() => {}} submitting />);
    const submit = screen.getByRole("button", { name: "Publicando…" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the server field errors without clearing the values", () => {
    render(
      <ReviewForm
        onSubmit={() => {}}
        submitting={false}
        fieldErrors={{ comment: "Mensaje del servidor." }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Comentario"), {
      target: { value: "Lo que escribí." },
    });
    expect(screen.getByText("Mensaje del servidor.")).toBeDefined();
    expect((screen.getByLabelText("Comentario") as HTMLTextAreaElement).value).toBe(
      "Lo que escribí.",
    );
  });
});
