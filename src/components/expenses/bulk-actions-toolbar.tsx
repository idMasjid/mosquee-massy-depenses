"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { SelectWithCreate, type SelectWithCreateOption } from "@/components/expenses/select-with-create";
import { createSupplierOption, createPaymentTypeOption, createPurchaseTypeOption } from "@/components/expenses/create-option-adapters";
import { bulkTransitionExpenses, bulkReassignExpenses, bulkDeleteExpenses } from "@/lib/actions/expense-actions";
import { availableTransitions, transitionRequiresNote } from "@/lib/workflow";
import {
  STATUS_LABELS,
  BULK_REASSIGN_FIELDS,
  type ExpenseStatus,
  type Role,
  type BulkReassignField,
} from "@/lib/constants";

const REASSIGN_FIELD_LABELS: Record<BulkReassignField, string> = {
  supplierName: "Fournisseur",
  paymentType: "Type de paiement",
  purchaseType: "Type d'achat",
};

function summarize(updated: number, skipped: number) {
  const base = `${updated} mise${updated > 1 ? "s" : ""} à jour`;
  return skipped > 0 ? `${base}, ${skipped} ignorée${skipped > 1 ? "s" : ""}.` : `${base}.`;
}

export function BulkActionsToolbar({
  role,
  selectedIds,
  selectedStatuses,
  suppliers,
  paymentTypes,
  purchaseTypes,
  onDone,
}: {
  role: Role;
  selectedIds: string[];
  selectedStatuses: ExpenseStatus[];
  suppliers: SelectWithCreateOption[];
  paymentTypes: SelectWithCreateOption[];
  purchaseTypes: SelectWithCreateOption[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [noteTarget, setNoteTarget] = useState<ExpenseStatus | null>(null);
  const [note, setNote] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignField, setReassignField] = useState<BulkReassignField>("supplierName");
  const [reassignValue, setReassignValue] = useState("");
  const [supplierOptions, setSupplierOptions] = useState(suppliers);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState(paymentTypes);
  const [purchaseTypeOptions, setPurchaseTypeOptions] = useState(purchaseTypes);

  const canReassignOrDelete = role === "ADMIN" || role === "IT";
  const targetStatuses = [...new Set(selectedStatuses.flatMap((s) => availableTransitions(role, s)))];
  const requiresNoteFor = (target: ExpenseStatus) => selectedStatuses.some((s) => transitionRequiresNote(role, s, target));

  const count = selectedIds.length;

  const runTransition = async (target: ExpenseStatus, withNote?: string) => {
    setPending(true);
    const result = await bulkTransitionExpenses(selectedIds, target, withNote);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(summarize(result.updated, result.skipped));
    setNoteTarget(null);
    setNote("");
    onDone();
  };

  const handleTransitionClick = (target: ExpenseStatus) => {
    if (requiresNoteFor(target)) {
      setNoteTarget(target);
      return;
    }
    runTransition(target);
  };

  const reassignFieldConfig = {
    supplierName: { options: supplierOptions, setOptions: setSupplierOptions, onCreate: createSupplierOption },
    paymentType: { options: paymentTypeOptions, setOptions: setPaymentTypeOptions, onCreate: createPaymentTypeOption },
    purchaseType: { options: purchaseTypeOptions, setOptions: setPurchaseTypeOptions, onCreate: createPurchaseTypeOption },
  }[reassignField];

  const handleReassignSubmit = async () => {
    if (!reassignValue.trim()) {
      toast.error("Choisissez une valeur.");
      return;
    }
    setPending(true);
    const result = await bulkReassignExpenses(selectedIds, reassignField, reassignValue);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(summarize(result.updated, result.skipped));
    setReassignOpen(false);
    setReassignValue("");
    onDone();
  };

  const handleDelete = async () => {
    setPending(true);
    const result = await bulkDeleteExpenses(selectedIds);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.deleted} dépense${result.deleted > 1 ? "s" : ""} supprimée${result.deleted > 1 ? "s" : ""}.`);
    onDone();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      <span className="text-sm font-medium">
        {count} sélectionnée{count > 1 ? "s" : ""}
      </span>
      <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
        Désélectionner
      </Button>

      {targetStatuses.length > 0 && <div className="mx-1 h-5 w-px bg-border" />}
      {targetStatuses.map((target) => (
        <Button key={target} variant="outline" size="sm" disabled={pending} onClick={() => handleTransitionClick(target)}>
          {STATUS_LABELS[target]}
        </Button>
      ))}

      {canReassignOrDelete && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setReassignOpen(true)}>
            Réaffecter…
          </Button>
        </>
      )}

      {role === "ADMIN" && (
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={pending} />}>Supprimer</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer {count} dépense{count > 1 ? "s" : ""} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Action définitive, historique et pièces jointes inclus. Pour garder une trace comptable, préférez un
                changement de statut plutôt qu&apos;une suppression.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={pending}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Note dialog for transitions that require one */}
      <Dialog open={noteTarget != null} onOpenChange={(v) => !v && setNoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteTarget ? `Passer au statut « ${STATUS_LABELS[noteTarget]} »` : ""}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Motif (obligatoire)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNoteTarget(null)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={() => noteTarget && runTransition(noteTarget, note)} disabled={pending || !note.trim()}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk reassign dialog */}
      <Dialog
        open={reassignOpen}
        onOpenChange={(v) => {
          setReassignOpen(v);
          if (v) setReassignValue("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Réaffecter {count} dépense{count > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Champ à modifier">
              <Select
                items={REASSIGN_FIELD_LABELS}
                value={reassignField}
                onValueChange={(v) => {
                  setReassignField((v ?? "supplierName") as BulkReassignField);
                  setReassignValue("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BULK_REASSIGN_FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {REASSIGN_FIELD_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Nouvelle valeur — ${REASSIGN_FIELD_LABELS[reassignField]}`}>
              <SelectWithCreate
                value={reassignValue}
                onValueChange={setReassignValue}
                options={reassignFieldConfig.options}
                onOptionCreated={(o) => reassignFieldConfig.setOptions((prev) => [...prev, o])}
                onCreate={reassignFieldConfig.onCreate}
                placeholder={`Sélectionner ${REASSIGN_FIELD_LABELS[reassignField].toLowerCase()}`}
                createLabel={`Ajouter ${REASSIGN_FIELD_LABELS[reassignField].toLowerCase()}`}
                dialogTitle={`Nouveau : ${REASSIGN_FIELD_LABELS[reassignField]}`}
              />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Annuler</DialogClose>
            <Button onClick={handleReassignSubmit} disabled={pending || !reassignValue}>
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
