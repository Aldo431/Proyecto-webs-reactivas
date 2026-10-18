import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StarRatingDisplay } from "./StarRatingDisplay.tsx";

describe("StarRatingDisplay", () => {
  it("announces the rating as a single labelled image", () => {
    render(<StarRatingDisplay rating={4} />);
    expect(
      screen.getByRole("img", { name: "4 de 5 estrellas" }),
    ).toBeDefined();
  });

  it("renders five stars", () => {
    const { container } = render(<StarRatingDisplay rating={2} />);
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });
});
