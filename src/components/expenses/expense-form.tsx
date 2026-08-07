"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { numeric } from "@/lib/form-utils";

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
  const router = useRouter();
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
      projectId: "",
      budgetLineId: "",
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
                <Select
                  items={Object.fromEntries(allowedStatuses.map((s) => [s, STATUS_LABELS[s]]))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
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
                  items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("budgetLineId", undefined);
                    setValue("rubriqueLabel", "");
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

          <Field label="Catégorie" required error={errors.rubriqueLabel?.message}>
            <Controller
              control={control}
              name="budgetLineId"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(
                    availableLines.map((l) => [l.id, `${l.rubrique}${l.productTitle ? ` — ${l.productTitle}` : ""}`]),
                  )}
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    const line = availableLines.find((l) => l.id === v);
                    setValue("rubriqueLabel", line?.rubrique ?? "");
                  }}
                  disabled={!projectId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={projectId ? "Sélectionner une catégorie" : "Choisir un projet d'abord"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLines.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">
                        Aucune ligne budgétaire pour ce projet. Créez-la d&apos;abord dans Projets &amp; budgets.
                      </p>
                    ) : (
                      availableLines.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.rubrique}
                          {l.productTitle ? ` — ${l.productTitle}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
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
          <Field label="Montant unitaire HT (€)" htmlFor="unitPriceHT" error={errors.unitPriceHT?.message}>
            <Input id="unitPriceHT" type="number" step="0.01" {...register("unitPriceHT", { setValueAs: numeric })} />
          </Field>
          <Field label="Quantité" htmlFor="quantity" required error={errors.quantity?.message}>
            <Input id="quantity" type="number" step="0.01" min="0" {...register("quantity", { setValueAs: numeric })} />
          </Field>
          <Field label="Livraison (€)" htmlFor="deliveryFee" error={errors.deliveryFee?.message}>
            <Input id="deliveryFee" type="number" step="0.01" {...register("deliveryFee", { setValueAs: numeric })} />
          </Field>
          <Field label="Frais import (€)" htmlFor="importFee" error={errors.importFee?.message}>
            <Input id="importFee" type="number" step="0.01" {...register("importFee", { setValueAs: numeric })} />
          </Field>
          <Field label="Réduction (€)" htmlFor="discount" error={errors.discount?.message}>
            <Input id="discount" type="number" step="0.01" {...register("discount", { setValueAs: numeric })} />
          </Field>
          <Field label="Taux TVA (%)" htmlFor="vatRate" error={errors.vatRate?.message}>
            <Input id="vatRate" type="number" step="0.01" {...register("vatRate", { setValueAs: numeric })} />
          </Field>
          <Field label="TVA (€)" htmlFor="vatAmount" error={errors.vatAmount?.message}>
            <Input id="vatAmount" type="number" step="0.01" {...register("vatAmount", { setValueAs: numeric })} />
          </Field>
          <Field label="Total HT (€)" htmlFor="totalHT" error={errors.totalHT?.message}>
            <Input id="totalHT" type="number" step="0.01" {...register("totalHT", { setValueAs: numeric })} />
          </Field>
          <Field label="Total TTC (€)" htmlFor="totalTTC" required error={errors.totalTTC?.message}>
            <Input id="totalTTC" type="number" step="0.01" {...register("totalTTC", { setValueAs: numeric })} />
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
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {expenseId ? "Enregistrer" : "Créer la dépense"}
        </Button>
      </div>
    </form>
  );
}
