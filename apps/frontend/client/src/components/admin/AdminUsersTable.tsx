import type { AdminUser, UserRole } from "@tiendadcc/utils";
import { formatDate } from "../../logic/adminFormat.ts";
import { nextRole } from "../../logic/adminMessages.ts";
import { Badge } from "../ui/badge.tsx";
import { RoleChangeDialog } from "./RoleChangeDialog.tsx";

interface AdminUsersTableProps {
  users: AdminUser[];
  /** Cuenta en sesión: su fila dice "(tú)" y no tiene botón (RF-12). */
  currentUserId: string | null;
  onChangeRole: (user: AdminUser, role: UserRole) => Promise<void>;
}

const HEADER = "px-3 py-2 font-medium whitespace-nowrap";

// Tabla de cuentas (spec 013, RF-12), dentro de un contenedor con
// `overflow-x-auto` para que en pantallas angostas se desplace la tabla y no
// la página (RNF-6). El rol se distingue por texto, no solo por color.
export function AdminUsersTable({
  users,
  currentUserId,
  onChangeRole,
}: AdminUsersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className={HEADER}>Usuario</th>
            <th scope="col" className={HEADER}>Correo</th>
            <th scope="col" className={HEADER}>Rol</th>
            <th scope="col" className={`${HEADER} text-right`}>Publicaciones</th>
            <th scope="col" className={`${HEADER} text-right`}>Reseñas</th>
            <th scope="col" className={HEADER}>Registro</th>
            <th scope="col" className={HEADER}>Acción</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr key={user.id} className="border-t border-border align-middle">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground"
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium break-words">
                        {user.displayName}
                        {isSelf && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            (tú)
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        @{user.username}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2 break-all">{user.email}</td>
                <td className="px-3 py-2">
                  {user.role === "admin" ? (
                    <Badge variant="destructive">Administrador</Badge>
                  ) : (
                    <Badge variant="secondary">Usuario</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {user.productCount}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {user.reviewCount}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-3 py-2">
                  {isSelf ? (
                    <span className="text-muted-foreground">Tu cuenta</span>
                  ) : (
                    <RoleChangeDialog
                      username={user.username}
                      targetRole={nextRole(user.role)}
                      onConfirm={() => onChangeRole(user, nextRole(user.role))}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
