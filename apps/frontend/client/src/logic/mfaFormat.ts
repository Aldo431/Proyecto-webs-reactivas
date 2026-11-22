export function mfaStatusLabel(enabled: boolean): string {
  return enabled ? "Activada" : "Desactivada";
}

export function mfaErrorFromStatus(status: number): string {
  if (status === 400) return "El código de verificación es inválido o ha expirado.";
  if (status === 401) return "La contraseña actual es incorrecta.";
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 409) return "No se pudo cambiar el estado de la verificación.";
  if (status === 429) {
    return "Has excedido el límite de intentos. Intenta más tarde.";
  }
  if (status === 503) {
    return "El servicio no está disponible en este momento. Inténtalo más tarde.";
  }
  return "No se pudo completar la acción. Inténtalo de nuevo.";
}
