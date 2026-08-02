"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import { createExpense, updateExpense } from "@/lib/actions/expense-actions";
import { STATUS_LABELS, type ExpenseStatus } from "@/lib/constants";

const CUSTOM_RUBRIQUE = "__custom__";

export type BudgetLineOption = {
  id: string;
  projectId: string;
  rubrique: string;
  productTitle: string | null;
  budgetedAmountHTCents: number;
};

export function ExpenseForm({
  projects,
  budgetLines,
  allowedStatuses,
  expenseId,
  defaultValues,
}: {
  projects: { id: string; name: string }[];
  budgetLines: BudgetLineOption[];
  allowedStatuses: ExpenseStatus[];
  expenseId?: string;
  defaultValues?: Partial<ExpenseFormValues>;
}) {
  const [useCustomRubrique, setUseCustomRubrique] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      status: allowedStatuses[0],
      entryDate: new Date().toISOString().slice(0, 10),
      quantity: 1,
      deliveryFee: 0,
      importFee: 0,
      discount: 0,
      totalHT: 0,
      totalTTC: 0,
      ...defaultValues,
    },
  });

  const projectId = watch("projectId");

  const availableLines = useMemo(
    () => budgetLines.filter((l) => l.projectId === projectId),
    [budgetLines, projectId],
  );

  const onSubmit = async (values: ExpenseFormValues) => {
    const result = expenseId ? await updateExpense(expenseId, values) : await createExpense(values);
    if (!result.success) {
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      {!expenseId && (
        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Statut initial" required error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Date de saisie" htmlFor="entryDate" required error={errors.entryDate?.message}>
            <Input id="entryDate" type="date" {...register("entryDate")} />
          </Field>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre du produit / prestation" htmlFor="productTitle" required error={errors.productTitle?.message}>
            <Input id="productTitle" {...register("productTitle")} />
          </Field>
          <Field label="Fournisseur" htmlFor="supplierName" required error={errors.supplierName?.message}>
            <Input id="supplierName" {...register("supplierName")} />
          </Field>

          <Field label="Projet" required error={errors.projectId?.message}>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("budgetLineId", undefined);
                    setValue("rubriqueLabel", "");
                    setUseCustomRubrique(false);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Rubrique" required error={errors.rubriqueLabel?.message}>
            {!useCustomRubrique ? (
              <Controller
                control={control}
                name="budgetLineId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      if (v === CUSTOM_RUBRIQUE) {
                        setUseCustomRubrique(true);
                        field.onChange(undefined);
                        setValue("rubriqueLabel", "");
                        return;
                      }
                      field.onChange(v);
                      const line = availableLines.find((l) => l.id === v);
                      setValue("rubriqueLabel", line?.rubrique ?? "");
                    }}
                    disabled={!projectId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={projectId ? "Sélectionner une rubrique" : "Choisir un projet d'abord"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLines.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.rubrique}
                          {l.productTitle ? ` — ${l.productTitle}` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_RUBRIQUE}>Autre (rubrique libre)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de la rubrique"
                  {...register("rubriqueLabel")}
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setUseCustomRubrique(false)}>
                  Choisir dans la liste
                </Button>
              </div>
            )}
          </Field>

          <Field label="Segment" htmlFor="segment">
            <Input id="segment" {...register("segment")} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Dates</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date de commande" htmlFor="orderDate">
            <Input id="orderDate" type="date" {...register("orderDate")} />
          </Field>
          <Field label="Date de facture" htmlFor="invoiceDate">
            <Input id="invoiceDate" type="date" {...register("invoiceDate")} />
          </Field>
          {expenseId && (
            <Field label="Date de saisie" htmlFor="entryDate" required error={errors.entryDate?.message}>
              <Input id="entryDate" type="date" {...register("entryDate")} />
            </Field>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Montants</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Montant unitaire HT (€)" htmlFor="unitPriceHT">
            <Input id="unitPriceHT" type="number" step="0.01" {...register("unitPriceHT", { valueAsNumber: true })} />
          </Field>
          <Field label="Quantité" htmlFor="quantity" required error={errors.quantity?.message}>
            <Input id="quantity" type="number" step="0.01" min="0" {...register("quantity", { valueAsNumber: true })} />
          </Field>
          <Field label="Livraison (€)" htmlFor="deliveryFee">
            <Input id="deliveryFee" type="number" step="0.01" {...register("deliveryFee", { valueAsNumber: true })} />
          </Field>
          <Field label="Frais import (€)" htmlFor="importFee">
            <Input id="importFee" type="number" step="0.01" {...register("importFee", { valueAsNumber: true })} />
          </Field>
          <Field label="Réduction (€)" htmlFor="discount">
            <Input id="discount" type="number" step="0.01" {...register("discount", { valueAsNumber: true })} />
          </Field>
          <Field label="Taux TVA (%)" htmlFor="vatRate">
            <Input id="vatRate" type="number" step="0.01" {...register("vatRate", { valueAsNumber: true })} />
          </Field>
          <Field label="TVA (€)" htmlFor="vatAmount">
            <Input id="vatAmount" type="number" step="0.01" {...register("vatAmount", { valueAsNumber: true })} />
          </Field>
          <Field label="Total HT (€)" htmlFor="totalHT" required error={errors.totalHT?.message}>
            <Input id="totalHT" type="number" step="0.01" {...register("totalHT", { valueAsNumber: true })} />
          </Field>
          <Field label="Total TTC (€)" htmlFor="totalTTC" required error={errors.totalTTC?.message}>
            <Input id="totalTTC" type="number" step="0.01" {...register("totalTTC", { valueAsNumber: true })} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Paiement &amp; références</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type de paiement" htmlFor="paymentType">
            <Input id="paymentType" {...register("paymentType")} />
          </Field>
          <Field label="Référence de paiement" htmlFor="paymentReference">
            <Input id="paymentReference" {...register("paymentReference")} />
          </Field>
          <Field label="Type d'achat (Internet, physique…)" htmlFor="purchaseType">
            <Input id="purchaseType" {...register("purchaseType")} />
          </Field>
          <Field label="N° bon de commande / devis" htmlFor="orderNumber">
            <Input id="orderNumber" {...register("orderNumber")} />
          </Field>
          <Field label="N° facture" htmlFor="invoiceNumber">
            <Input id="invoiceNumber" {...register("invoiceNumber")} />
          </Field>
          <Field label="Identifiant fournisseur" htmlFor="supplierIdentifier">
            <Input id="supplierIdentifier" {...register("supplierIdentifier")} />
          </Field>
          <Field label="Lien facture (externe)" htmlFor="invoiceLink" className="sm:col-span-3">
            <Textarea id="invoiceLink" rows={2} {...register("invoiceLink")} />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {expenseId ? "Enregistrer" : "Créer la dépense"}
        </Button>
      </div>
    </form>
  );
}
