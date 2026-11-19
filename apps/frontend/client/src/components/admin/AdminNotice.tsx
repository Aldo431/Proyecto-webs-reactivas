import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

interface AdminNoticeProps {
  tone: "success" | "error";
  children: ReactNode;
}

// Aviso tras una acción (spec 013, convenciones). El éxito usa `role="status"`
// (como 008) con "✓ ok" en verde de terminal; el error usa `role="alert"` en
// ámbar con ícono y texto, nunca solo color (spec 00, RF-3).
export function AdminNotice({ tone, children }: AdminNoticeProps) {
  if (tone === "success") {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
      >
        <span aria-hidden="true" className="font-mono text-terminal-success">
          ✓ ok
        </span>
        <span>{children}</span>
      </p>
    );
  }
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive bg-card px-3 py-2 text-sm text-destructive"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
