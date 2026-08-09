"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteExpense } from "@/lib/actions/expense-actions";

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      // On success, deleteExpense redirects server-side to /expenses — this
      // component unmounts before ever seeing a resolved result, so a success
      // toast here would never actually render; the navigation is the confirmation.
      const result = await deleteExpense(expenseId);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Supprimer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette dépense ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive et supprime aussi son historique et ses pièces jointes. Pour garder une
              trace comptable, préférez le statut « Annulé ».
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
