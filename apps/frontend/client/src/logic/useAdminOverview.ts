import type { AdminOverview } from "@tiendadcc/utils";
import { fetchAdminOverview } from "./adminApi.ts";
import { useAdminResource, type AdminResourceHook } from "./useAdminResource.ts";

// Datos del Resumen (spec 013, RF-10, RF-14): `loading | error | ready`,
// `reload()` para "Actualizar" / "Reintentar". No hay caché entre visitas: al
// volver a `#/admin` el componente se monta de nuevo y los pide otra vez.
export function useAdminOverview(): Pick<
  AdminResourceHook<AdminOverview>,
  "state" | "reload"
> {
  const { state, reload } = useAdminResource<AdminOverview>(
    "overview",
    fetchAdminOverview,
  );
  return { state, reload };
}
