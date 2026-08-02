"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { budgetLineFormSchema, type BudgetLineFormValues } from "@/lib/validations/project";
import { createBudgetLine } from "@/lib/actions/project-actions";

export type AllowedRubriqueOption = { id: string; projectId: string; rubrique: string };

export function NewBudgetLineDialog({
  projects,
  allowedRubriques,
}: {
  projects: { id: string; name: string }[];
  allowedRubriques: AllowedRubriqueOption[];
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetLineFormValues>({
    resolver: zodResolver(budgetLineFormSchema),
    defaultValues: { projectId: "", rubrique: "", productTitle: "", budgetedAmountHT: 0 },
  });

  const projectId = watch("projectId");
  const availableRubriques = useMemo(
    () => allowedRubriques.filter((r) => r.projectId === projectId),
    [allowedRubriques, projectId],
  );

  const onSubmit = async (values: BudgetLineFormValues) => {
    const result = await createBudgetLine(values);
    if (result.success) {
      toast.success("Ligne budgétaire créée.");
      reset({ projectId: "", rubrique: "", productTitle: "", budgetedAmountHT: 0 });
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nouvelle ligne budgétaire
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle ligne budgétaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                    setValue("rubrique", "");
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
          <Field label="Rubrique" required error={errors.rubrique?.message}>
            <Controller
              control={control}
              name="rubrique"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(availableRubriques.map((r) => [r.rubrique, r.rubrique]))}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!projectId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={projectId ? "Sélectionner une rubrique" : "Choisir un projet d'abord"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRubriques.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">
                        Aucune rubrique autorisée pour ce projet. Ajoutez-la dans Rubriques.
                      </p>
                    ) : (
                      availableRubriques.map((r) => (
                        <SelectItem key={r.id} value={r.rubrique}>
                          {r.rubrique}
                        </SelectItem>
                      ))
                    )}
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
              {...register("budgetedAmountHT", { valueAsNumber: true })}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
