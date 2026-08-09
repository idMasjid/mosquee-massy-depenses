"use client";

import { useState } from "react";
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
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    const result = await deleteExpense(expenseId);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
    }
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
