import { describe, expect, it } from "vitest";
import { mfaErrorFromStatus, mfaStatusLabel } from "./mfaFormat.ts";

describe("mfaStatusLabel", () => {
  it("describe el estado de la verificación", () => {
    expect(mfaStatusLabel(true)).toBe("Activada");
    expect(mfaStatusLabel(false)).toBe("Desactivada");
  });
});

describe("mfaErrorFromStatus", () => {
  it("devuelve un mensaje en español para cada estado conocido", () => {
    expect(mfaErrorFromStatus(400)).toBe(
      "El código de verificación es inválido o ha expirado.",
    );
    expect(mfaErrorFromStatus(401)).toBe("La contraseña actual es incorrecta.");
    expect(mfaErrorFromStatus(403)).toBe(
      "No tienes permiso para realizar esta acción.",
    );
    expect(mfaErrorFromStatus(409)).toBe(
      "No se pudo cambiar el estado de la verificación.",
    );
    expect(mfaErrorFromStatus(429)).toBe(
      "Has excedido el límite de intentos. Intenta más tarde.",
    );
    expect(mfaErrorFromStatus(503)).toBe(
      "El servicio no está disponible en este momento. Inténtalo más tarde.",
    );
  });

  it("tiene un mensaje genérico para estados desconocidos", () => {
    expect(mfaErrorFromStatus(500)).toBe(
      "No se pudo completar la acción. Inténtalo de nuevo.",
    );
  });
});
