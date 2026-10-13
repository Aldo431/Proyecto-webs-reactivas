/*
 * Origen: código propio de tiendaDCC (spec 008, RF-18…RF-20).
 * Avisos que viajan en el `state` de la navegación hacia /mis-publicaciones.
 */
import { z } from "zod";

export const PUBLISHED_NOTICE = "Tu producto se publicó.";
export const UPDATED_NOTICE = "Cambios guardados.";
export const DELETED_NOTICE = "Publicación eliminada.";

const noticeStateSchema = z.object({ notice: z.string().min(1) });

export function noticeState(notice: string): { notice: string } {
  return { notice };
}

// Reads the notice from a router `state` (unknown by contract); anything that
// is not `{ notice: string }` yields null.
export function readNotice(state: unknown): string | null {
  const parsed = noticeStateSchema.safeParse(state);
  return parsed.success ? parsed.data.notice : null;
}
