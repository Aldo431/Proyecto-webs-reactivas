import type { UserRole } from "@tiendadcc/utils";
import { useState, type MouseEvent } from "react";
import { roleDialogTexts } from "../../logic/adminMessages.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog.tsx";
import { Button } from "../ui/button.tsx";

interface RoleChangeDialogProps {
  username: string;
  /** Rol al que pasaría la cuenta si se confirma. */
  targetRole: UserRole;
  /** Resuelve cuando terminó el cambio (con éxito o no). */
  onConfirm: () => Promise<void>;
}

// Botón "Hacer administrador" / "Quitar administrador" con su confirmación
// (spec 013, RF-12). Radix atrapa el foco, cierra con Escape y devuelve el
// foco al botón. Mientras responde la API los botones quedan deshabilitados.
export function RoleChangeDialog({
  username,
  targetRole,
  onConfirm,
}: RoleChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const texts = roleDialogTexts(username, targetRole);

  async function handleConfirm() {
    setSaving(true);
    await onConfirm();
    setSaving(false);
    setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!saving) {
          setOpen(next);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`${texts.confirmLabel} a @${username}`}
        >
          {texts.confirmLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{texts.title}</AlertDialogTitle>
          <AlertDialogDescription>{texts.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              // Mantiene el diálogo abierto mientras responde la API.
              event.preventDefault();
              if (!saving) {
                void handleConfirm();
              }
            }}
          >
            {saving ? "Guardando…" : texts.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
