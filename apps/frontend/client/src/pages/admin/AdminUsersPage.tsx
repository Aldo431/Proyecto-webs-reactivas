import { USER_ROLES, type AdminUser, type UserRole } from "@tiendadcc/utils";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminErrorState } from "../../components/admin/AdminErrorState.tsx";
import { AdminNotice } from "../../components/admin/AdminNotice.tsx";
import { AdminSearchField } from "../../components/admin/AdminSearchField.tsx";
import { AdminSectionHeading } from "../../components/admin/AdminSectionHeading.tsx";
import { AdminSelect } from "../../components/admin/AdminSelect.tsx";
import { AdminUsersTable } from "../../components/admin/AdminUsersTable.tsx";
import { CatalogPagination } from "../../components/CatalogPagination.tsx";
import { useAuth } from "../../stores/authStore.ts";
import { fetchAdminUsers, setUserRole } from "../../logic/adminApi.ts";
import { formatRange } from "../../logic/adminFormat.ts";
import { USERS_EMPTY, roleNotice } from "../../logic/adminMessages.ts";
import {
  ADMIN_ROLE_OPTIONS,
  buildAdminUsersParams,
  changeFilters,
  changePage,
  parseAdminUsersParams,
  type AdminUsersQuery,
} from "../../logic/adminQuery.ts";
import { useAdminList } from "../../logic/useAdminList.ts";
import { useDebouncedSearch } from "../../logic/useDebouncedSearch.ts";

interface Notice {
  tone: "success" | "error";
  text: string;
}

const NOT_FOUND = 404;

const ROLE_OPTIONS = ADMIN_ROLE_OPTIONS.map((option) => ({
  value: option.value ?? "",
  label: option.label,
}));

// /admin/usuarios (spec 013, RF-12): accounts with their role, filters kept in
// the URL and a confirmed role change. The own row has no button (the API also
// answers 403), so there is always at least one administrator.
export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(
    () => parseAdminUsersParams(searchParams),
    [searchParams],
  );
  const goTo = useCallback(
    (next: AdminUsersQuery, replace = false) => {
      setSearchParams(buildAdminUsersParams(next), { replace });
    },
    [setSearchParams],
  );
  const [notice, setNotice] = useState<Notice | null>(null);

  const { state, reload, updateItems } = useAdminList(fetchAdminUsers, query, {
    onPageAdjusted: (pagina) => goTo(changePage(query, pagina), true),
  });
  const [searchText, setSearchText] = useDebouncedSearch(query.q, (q) =>
    goTo(changeFilters(query, { q })),
  );

  async function handleChangeRole(
    user: AdminUser,
    role: UserRole,
  ): Promise<void> {
    setNotice(null);
    const result = await setUserRole(user.id, role);
    if (result.ok) {
      updateItems((items) =>
        items.map((item) => (item.id === user.id ? result.data : item)),
      );
      setNotice({
        tone: "success",
        text: roleNotice(result.data.username, result.data.role),
      });
      // Con un filtro de rol activo la fila puede dejar de corresponder.
      if (query.rol !== null) {
        reload();
      }
      return;
    }
    setNotice({ tone: "error", text: result.message });
    if (result.status === NOT_FOUND) {
      reload();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionHeading path="/admin/usuarios" />

      <div className="flex flex-wrap items-end gap-4">
        <AdminSearchField
          id="admin-users-search"
          placeholder="Nombre, usuario o correo"
          value={searchText}
          onChange={setSearchText}
        />
        <AdminSelect
          id="admin-users-role"
          label="Rol"
          options={ROLE_OPTIONS}
          value={query.rol ?? ""}
          onChange={(value) =>
            goTo(
              changeFilters(query, {
                rol: USER_ROLES.find((role) => role === value) ?? null,
              }),
            )
          }
        />
      </div>

      {notice !== null && (
        <AdminNotice tone={notice.tone}>{notice.text}</AdminNotice>
      )}

      {state.status === "loading" && (
        <p role="status" aria-busy="true" className="text-muted-foreground">
          Cargando usuarios…
        </p>
      )}
      {state.status === "error" && (
        <AdminErrorState
          message={state.message}
          httpStatus={state.httpStatus}
          onRetry={reload}
        />
      )}
      {state.status === "ready" &&
        (state.data.items.length === 0 ? (
          <p className="text-muted-foreground">{USERS_EMPTY}</p>
        ) : (
          <div className="flex flex-col gap-4" aria-busy={state.refreshing}>
            <AdminUsersTable
              users={state.data.items}
              currentUserId={currentUser?.id ?? null}
              onChangeRole={handleChangeRole}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {formatRange(
                  state.data.pagina,
                  state.data.porPagina,
                  state.data.total,
                )}
              </p>
              <CatalogPagination
                pagina={state.data.pagina}
                totalPaginas={state.data.totalPaginas}
                onSelectPage={(pagina) => goTo(changePage(query, pagina))}
              />
            </div>
          </div>
        ))}
    </div>
  );
}
