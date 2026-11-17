import { AdminSectionHeading } from "../../components/admin/AdminSectionHeading.tsx";

// /admin (012 RF-7): the only terminal nod of the admin view.
export function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-sm text-muted-foreground">
        <span aria-hidden="true" className="mr-2 text-terminal-prompt">
          $
        </span>
        sudo tiendadcc --resumen
      </p>
      <AdminSectionHeading path="/admin" />
    </div>
  );
}
