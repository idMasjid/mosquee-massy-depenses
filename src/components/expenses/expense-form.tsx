"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileScan } from "lucide-react";
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
import { SelectWithCreate, type SelectWithCreateOption } from "@/components/expenses/select-with-create";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import { createExpense, updateExpense } from "@/lib/actions/expense-actions";
import { extractInvoiceData } from "@/lib/actions/invoice-actions";
import { createSupplier } from "@/lib/actions/supplier-actions";
import { createPaymentType } from "@/lib/actions/payment-type-actions";
import { createPurchaseType } from "@/lib/actions/purchase-type-actions";
import { STATUS_LABELS, type ExpenseStatus } from "@/lib/constants";
import { numeric } from "@/lib/form-utils";

export type BudgetLineOption = {
  id: string;
  projectId: string;
  rubrique: string;
  productTitle: string | null;
  budgetedAmountHTCents: number;
};

// Editing an old expense whose supplier/payment/purchase type predates these
// closed lists (or was typed freely before this feature) must still show its
// current value as selected, even if it's not in the canonical table.
function withCurrentValue(options: SelectWithCreateOption[], currentValue: string | undefined): SelectWithCreateOption[] {
  if (!currentValue || options.some((o) => o.name === currentValue)) return options;
  return [...options, { id: `legacy:${currentValue}`, name: currentValue }];
}

export function ExpenseForm({
  projects,
  budgetLines,
  suppliers,
  paymentTypes,
  purchaseTypes,
  allowedStatuses,
  expenseId,
  defaultValues,
}: {
  projects: { id: string; name: string }[];
  budgetLines: BudgetLineOption[];
  suppliers: SelectWithCreateOption[];
  paymentTypes: SelectWithCreateOption[];
  purchaseTypes: SelectWithCreateOption[];
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
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [invoiceFileName, setInvoiceFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [supplierOptions, setSupplierOptions] = useState(() => withCurrentValue(suppliers, defaultValues?.supplierName));
  const [paymentTypeOptions, setPaymentTypeOptions] = useState(() => withCurrentValue(paymentTypes, defaultValues?.paymentType));
  const [purchaseTypeOptions, setPurchaseTypeOptions] = useState(() => withCurrentValue(purchaseTypes, defaultValues?.purchaseType));

  const handleCreateSupplier = async (name: string) => {
    const result = await createSupplier(name);
    return result.success ? { success: true as const, id: result.supplier.id, name: result.supplier.name } : result;
  };
  const handleCreatePaymentType = async (name: string) => {
    const result = await createPaymentType(name);
    return result.success ? { success: true as const, id: result.paymentType.id, name: result.paymentType.name } : result;
  };
  const handleCreatePurchaseType = async (name: string) => {
    const result = await createPurchaseType(name);
    return result.success ? { success: true as const, id: result.purchaseType.id, name: result.purchaseType.name } : result;
  };

  // Matches free-text AI-extracted values against the closed lists (accent/case-insensitive
  // isn't needed here, only trim+case, since these are short catalog-style names) — an
  // unmatched guess is left blank rather than silently breaking the closed list.
  const findOptionMatch = (options: SelectWithCreateOption[], raw: string | null) => {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    return options.find((o) => o.name.trim().toLowerCase() === normalized) ?? null;
  };

  const handleAnalyzeInvoice = async () => {
    const file = invoiceInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choisissez d'abord un fichier.");
      return;
    }
    setAnalyzing(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await extractInvoiceData(formData);
    setAnalyzing(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    const d = result.data;
    const unmatched: string[] = [];

    const supplierMatch = findOptionMatch(supplierOptions, d.supplierName);
    if (supplierMatch) setValue("supplierName", supplierMatch.name);
    else if (d.supplierName) unmatched.push(`fournisseur « ${d.supplierName} »`);

    if (d.productTitle) setValue("productTitle", d.productTitle);
    if (d.orderDate) setValue("orderDate", d.orderDate);
    if (d.invoiceDate) setValue("invoiceDate", d.invoiceDate);
    if (d.orderNumber) setValue("orderNumber", d.orderNumber);
    if (d.invoiceNumber) setValue("invoiceNumber", d.invoiceNumber);
    if (d.unitPriceHT != null) setValue("unitPriceHT", d.unitPriceHT);
    if (d.quantity != null) setValue("quantity", d.quantity);
    if (d.deliveryFee != null) setValue("deliveryFee", d.deliveryFee);
    if (d.importFee != null) setValue("importFee", d.importFee);
    if (d.discount != null) setValue("discount", d.discount);
    if (d.totalHT != null) setValue("totalHT", d.totalHT);
    if (d.vatRate != null) setValue("vatRate", d.vatRate);
    if (d.vatAmount != null) setValue("vatAmount", d.vatAmount);
    if (d.totalTTC != null) setValue("totalTTC", d.totalTTC);
    if (d.paymentReference) setValue("paymentReference", d.paymentReference);

    const paymentTypeMatch = findOptionMatch(paymentTypeOptions, d.paymentType);
    if (paymentTypeMatch) setValue("paymentType", paymentTypeMatch.name);
    else if (d.paymentType) unmatched.push(`type de paiement « ${d.paymentType} »`);

    const suffix =
      unmatched.length > 0 ? ` Non reconnus dans les listes (à sélectionner manuellement) : ${unmatched.join(", ")}.` : "";
    toast.success(`Champs pré-remplis depuis la facture — vérifiez avant d'enregistrer.${suffix}`);
  };

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
        <section className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          <input
            ref={invoiceInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => setInvoiceFileName(e.target.files?.[0]?.name ?? null)}
          />
          <Button type="button" variant="outline" size="sm" disabled={analyzing} onClick={() => invoiceInputRef.current?.click()}>
            <FileScan className="size-4" />
            Choisir une facture
          </Button>
          <span className="flex-1 truncate text-sm text-muted-foreground">
            {invoiceFileName ?? "Optionnel : pré-remplir le formulaire depuis une facture (PDF ou image)."}
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={analyzing || !invoiceFileName} onClick={handleAnalyzeInvoice}>
            {analyzing ? "Analyse en cours…" : "Analyser"}
          </Button>
        </section>
      )}

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
          <Field label="Fournisseur" required error={errors.supplierName?.message}>
            <Controller
              control={control}
              name="supplierName"
              render={({ field }) => (
                <SelectWithCreate
                  value={field.value}
                  onValueChange={field.onChange}
                  options={supplierOptions}
                  onOptionCreated={(o) => setSupplierOptions((prev) => [...prev, o])}
                  onCreate={handleCreateSupplier}
                  placeholder="Sélectionner un fournisseur"
                  createLabel="Ajouter un fournisseur"
                  dialogTitle="Nouveau fournisseur"
                />
              )}
            />
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
          <Field label="Type de paiement" error={errors.paymentType?.message}>
            <Controller
              control={control}
              name="paymentType"
              render={({ field }) => (
                <SelectWithCreate
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  options={paymentTypeOptions}
                  onOptionCreated={(o) => setPaymentTypeOptions((prev) => [...prev, o])}
                  onCreate={handleCreatePaymentType}
                  placeholder="Sélectionner un type de paiement"
                  createLabel="Ajouter un type de paiement"
                  dialogTitle="Nouveau type de paiement"
                />
              )}
            />
          </Field>
          <Field label="Référence de paiement" htmlFor="paymentReference">
            <Input id="paymentReference" {...register("paymentReference")} />
          </Field>
          <Field label="Type d'achat (Internet, physique…)" error={errors.purchaseType?.message}>
            <Controller
              control={control}
              name="purchaseType"
              render={({ field }) => (
                <SelectWithCreate
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  options={purchaseTypeOptions}
                  onOptionCreated={(o) => setPurchaseTypeOptions((prev) => [...prev, o])}
                  onCreate={handleCreatePurchaseType}
                  placeholder="Sélectionner un type d'achat"
                  createLabel="Ajouter un type d'achat"
                  dialogTitle="Nouveau type d'achat"
                />
              )}
            />
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
