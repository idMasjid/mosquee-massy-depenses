"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteBudgetLine } from "@/lib/actions/project-actions";

export function DeleteBudgetLineButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await deleteBudgetLine(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success("Ligne budgétaire supprimée.");
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Supprimer ${label}`}
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette ligne budgétaire ?</DialogTitle>
            <DialogDescription>
              « {label} » sera définitivement supprimée. Impossible si des dépenses y sont reliées — archivez-la
              dans ce cas plutôt que de la supprimer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={isPending}>
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
