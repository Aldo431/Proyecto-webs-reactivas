import { useState, type MouseEvent } from "react";
import { Button } from "./ui/button.tsx";
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
} from "./ui/alert-dialog.tsx";

interface ConfirmDeleteDialogProps {
  // Product name; when given, it builds the default texts (008 RF-19).
  productName?: string | undefined;
  // Resolves when the deletion finished (successfully or not); the dialog
  // stays open and its buttons disabled until then.
  onConfirm: () => Promise<void>;
  title?: string | undefined;
  description?: string | undefined;
  confirmLabel?: string | undefined;
  triggerLabel?: string | undefined;
  triggerAriaLabel?: string | undefined;
}

// Delete button plus its confirmation (008 RF-19). Radix traps the focus
// inside, closes with Escape and returns the focus to the trigger button.
// Reviews reuse it with the optional props instead of duplicating the dialog
// (010 RF-6, D7), while products keep their defaults.
export function ConfirmDeleteDialog({
  productName,
  onConfirm,
  title = "Eliminar publicación",
  description,
  confirmLabel = "Eliminar",
  triggerLabel = "Eliminar",
  triggerAriaLabel,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const message =
    description ??
    (productName === undefined
      ? "Esta acción no se puede deshacer."
      : `¿Eliminar «${productName}»? Esta acción no se puede deshacer.`);
  const triggerText =
    triggerAriaLabel ??
    (productName === undefined ? triggerLabel : `Eliminar ${productName}`);

  async function handleConfirm() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!deleting) {
          setOpen(next);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={triggerText}
        >
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              // Keep the dialog open while the request is in flight.
              event.preventDefault();
              if (!deleting) {
                void handleConfirm();
              }
            }}
          >
            {deleting ? "Eliminando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
