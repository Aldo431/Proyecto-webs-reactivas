import { render, screen } from "@testing-library/react";
import type { Promotion } from "@tiendadcc/utils";
import { describe, expect, it } from "vitest";
import { PromotionBadge } from "./PromotionBadge.tsx";

const base: Promotion = {
  id: "promo-1",
  type: "quantityPack3x2",
  label: "Pack 3x2",
  active: true,
  startsAt: null,
  endsAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
};

describe("PromotionBadge", () => {
  it("muestra la etiqueta corta de la promoción", () => {
    render(<PromotionBadge promotion={base} />);
    expect(screen.getByText("Pack 3x2")).toBeDefined();
  });

  it("muestra el descuento de alumno y el 2x15%", () => {
    const { rerender } = render(
      <PromotionBadge promotion={{ ...base, type: "studentDiscount" }} />,
    );
    expect(screen.getByText("20% alumno")).toBeDefined();

    rerender(
      <PromotionBadge promotion={{ ...base, type: "quantityPack2x15" }} />,
    );
    expect(screen.getByText("2x15%")).toBeDefined();
  });
});
