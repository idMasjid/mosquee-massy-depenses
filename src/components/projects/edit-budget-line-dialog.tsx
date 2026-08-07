"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { budgetLineUpdateSchema, type BudgetLineUpdateValues } from "@/lib/validations/project";
import { updateBudgetLine } from "@/lib/actions/project-actions";
import { fromCents } from "@/lib/money";
import { numeric } from "@/lib/form-utils";
import type { AllowedRubriqueOption } from "@/components/projects/new-budget-line-dialog";

export type EditableBudgetLine = {
  id: string;
  projectId: string;
  rubrique: string;
  productTitle: string | null;
  budgetedAmountHTCents: number;
};

export function EditBudgetLineDialog({
  line,
  allowedRubriques,
}: {
  line: EditableBudgetLine;
  allowedRubriques: AllowedRubriqueOption[];
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetLineUpdateValues>({
    resolver: zodResolver(budgetLineUpdateSchema),
    defaultValues: {
      rubrique: line.rubrique,
      productTitle: line.productTitle ?? "",
      budgetedAmountHT: fromCents(line.budgetedAmountHTCents),
    },
  });

  const availableRubriques = allowedRubriques.filter((r) => r.projectId === line.projectId);

  const onSubmit = async (values: BudgetLineUpdateValues) => {
    const result = await updateBudgetLine(line.id, values);
    if (result.success) {
      toast.success("Ligne budgétaire mise à jour.");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          reset({
            rubrique: line.rubrique,
            productTitle: line.productTitle ?? "",
            budgetedAmountHT: fromCents(line.budgetedAmountHTCents),
          });
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Modifier ${line.rubrique}`} />}
      >
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la ligne budgétaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Catégorie" required error={errors.rubrique?.message}>
            <Controller
              control={control}
              name="rubrique"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(availableRubriques.map((r) => [r.rubrique, r.rubrique]))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRubriques.map((r) => (
                      <SelectItem key={r.id} value={r.rubrique}>
                        {r.rubrique}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Titre produit (optionnel)" htmlFor="productTitle">
            <Input id="productTitle" {...register("productTitle")} />
          </Field>
          <Field label="Budget alloué HT (€)" htmlFor="budgetedAmountHT" required error={errors.budgetedAmountHT?.message}>
            <Input
              id="budgetedAmountHT"
              type="number"
              step="0.01"
              min="0"
              {...register("budgetedAmountHT", { setValueAs: numeric })}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Annuler</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
