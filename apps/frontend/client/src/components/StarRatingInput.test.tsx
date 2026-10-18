import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StarRatingInput } from "./StarRatingInput.tsx";

describe("StarRatingInput", () => {
  it("renders one radio per star, each announcing its value", () => {
    render(
      <StarRatingInput
        name="rating"
        legend="Tu calificación"
        value={0}
        onChange={() => {}}
      />,
    );
    for (let star = 1; star <= 5; star += 1) {
      expect(
        screen.getByRole("radio", { name: `${star} de 5 estrellas` }),
      ).toBeDefined();
    }
  });

  it("exposes the group through its legend", () => {
    render(
      <StarRatingInput
        name="rating"
        legend="Tu calificación"
        value={0}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("group", { name: "Tu calificación" })).toBeDefined();
  });

  it("marks the star matching the value as checked", () => {
    render(
      <StarRatingInput
        name="rating"
        legend="Tu calificación"
        value={3}
        onChange={() => {}}
      />,
    );
    const checked = screen.getByRole("radio", { name: "3 de 5 estrellas" });
    expect((checked as HTMLInputElement).checked).toBe(true);
  });

  it("reports the chosen star through onChange", () => {
    const onChange = vi.fn();
    render(
      <StarRatingInput
        name="rating"
        legend="Tu calificación"
        value={0}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "5 de 5 estrellas" }));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
