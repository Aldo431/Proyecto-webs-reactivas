import { useState } from "react";
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
  productName: string;
  // Resolves when the deletion finished (successfully or not); the dialog
  // stays open and its buttons disabled until then.
  onConfirm: () => Promise<void>;
}

// Delete button plus its confirmation (008 RF-19). Radix traps the focus
// inside, closes with Escape and returns the focus to the trigger button.
export function ConfirmDeleteDialog({
  productName,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
    setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
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
          aria-label={`Eliminar ${productName}`}
        >
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar publicación</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Eliminar «{productName}»? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(event) => {
              // Keep the dialog open while the request is in flight.
              event.preventDefault();
              if (!deleting) {
                void handleConfirm();
              }
            }}
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
