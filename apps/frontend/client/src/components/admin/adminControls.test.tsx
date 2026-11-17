import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminNotice } from "./AdminNotice.tsx";
import { AdminSearchField } from "./AdminSearchField.tsx";
import { AdminSelect } from "./AdminSelect.tsx";
import { FeaturedSwitch } from "./FeaturedSwitch.tsx";
import { SegmentedFilter } from "./SegmentedFilter.tsx";

describe("AdminNotice", () => {
  it("announces a success with role status and the green terminal tone", () => {
    render(<AdminNotice tone="success">Publicación eliminada.</AdminNotice>);

    const notice = screen.getByRole("status");
    expect(notice.textContent).toContain("Publicación eliminada.");
    expect(notice.querySelector(".text-terminal-success")).not.toBeNull();
  });

  it("announces an error with role alert, amber tone and text", () => {
    render(<AdminNotice tone="error">Producto no encontrado.</AdminNotice>);

    const notice = screen.getByRole("alert");
    expect(notice.textContent).toBe("Producto no encontrado.");
    expect(notice.className).toContain("text-destructive");
  });
});

describe("SegmentedFilter", () => {
  const options = [
    { value: false, label: "Todos" },
    { value: true, label: "Destacados" },
  ];

  it("marks only the active option with aria-pressed", () => {
    render(
      <SegmentedFilter
        ariaLabel="Mostrar"
        options={options}
        value={true}
        onChange={() => {}}
      />,
    );

    const group = screen.getByRole("group", { name: "Mostrar" });
    expect(group).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Destacados" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("reports the chosen value, including null", () => {
    const onChange = vi.fn();
    render(
      <SegmentedFilter<string | null>
        ariaLabel="Calificación"
        options={[
          { value: null, label: "Todas" },
          { value: "bajas", label: "1–2 estrellas" },
        ]}
        value={null}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "1–2 estrellas" }));
    expect(onChange).toHaveBeenLastCalledWith("bajas");
    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe("FeaturedSwitch", () => {
  it("is a switch with its state and accessible name", () => {
    render(
      <FeaturedSwitch
        checked={true}
        disabled={false}
        label="Destacar «Taza DCC»"
        onToggle={() => {}}
      />,
    );

    const toggle = screen.getByRole("switch", { name: "Destacar «Taza DCC»" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("toggles on click and on keyboard activation", () => {
    const onToggle = vi.fn();
    render(
      <FeaturedSwitch
        checked={false}
        disabled={false}
        label="Destacar «Taza»"
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole("switch"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", () => {
    const onToggle = vi.fn();
    render(
      <FeaturedSwitch
        checked={false}
        disabled
        label="Destacar «Taza»"
        onToggle={onToggle}
      />,
    );

    const toggle = screen.getByRole("switch") as HTMLButtonElement;
    fireEvent.click(toggle);

    expect(toggle.disabled).toBe(true);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("AdminSearchField / AdminSelect", () => {
  it("labels the search field Buscar with its placeholder", () => {
    const onChange = vi.fn();
    render(
      <AdminSearchField
        id="s"
        placeholder="Nombre o vendedor"
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText("Buscar") as HTMLInputElement;
    expect(input.placeholder).toBe("Nombre o vendedor");
    fireEvent.change(input, { target: { value: "taza" } });
    expect(onChange).toHaveBeenCalledWith("taza");
  });

  it("labels the select and reports the chosen value", () => {
    const onChange = vi.fn();
    render(
      <AdminSelect
        id="c"
        label="Categoría"
        value=""
        options={[
          { value: "", label: "Todas" },
          { value: "Tazas", label: "Tazas" },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "Tazas" },
    });

    expect(onChange).toHaveBeenCalledWith("Tazas");
  });
});
