"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { availableTransitions, transitionRequiresNote } from "@/lib/workflow";
import { transitionExpense } from "@/lib/actions/expense-actions";
import { STATUS_LABELS, type ExpenseStatus, type Role } from "@/lib/constants";

const BUTTON_VARIANT: Partial<Record<ExpenseStatus, "default" | "outline" | "destructive" | "secondary">> = {
  VALIDE: "default",
  REALISE: "default",
  REJETE: "destructive",
  ANNULE: "destructive",
  EN_ATTENTE: "secondary",
  A_VENIR: "outline",
};

export function StatusActions({
  expenseId,
  status,
  role,
}: {
  expenseId: string;
  status: ExpenseStatus;
  role: Role;
}) {
  const [target, setTarget] = useState<ExpenseStatus | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const transitions = availableTransitions(role, status);
  if (transitions.length === 0) return null;

  const requiresNote = target ? transitionRequiresNote(role, status, target) : false;

  const confirm = () => {
    if (!target) return;
    if (requiresNote && !note.trim()) {
      toast.error("Une note est requise pour cette action.");
      return;
    }
    startTransition(async () => {
      const result = await transitionExpense({ expenseId, toStatus: target, note: note || undefined });
      if (result.success) {
        toast.success(`Statut mis à jour: ${STATUS_LABELS[target]}`);
        setTarget(null);
        setNote("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((to) => (
          <Button key={to} variant={BUTTON_VARIANT[to] ?? "outline"} size="sm" onClick={() => setTarget(to)}>
            {STATUS_LABELS[to]}
          </Button>
        ))}
      </div>

      <Dialog open={target != null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target ? `Passer au statut "${STATUS_LABELS[target]}"` : ""}</DialogTitle>
            <DialogDescription>
              Cette action sera enregistrée dans l&apos;historique de la dépense.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={requiresNote ? "Motif (obligatoire)" : "Note (optionnelle)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTarget(null)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={confirm} disabled={pending}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
