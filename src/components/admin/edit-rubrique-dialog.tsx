"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { updateAllowedRubrique } from "@/lib/actions/rubrique-actions";
import { rubriqueRenameFormSchema, type RubriqueRenameFormValues } from "@/lib/validations/rubrique";

export function EditRubriqueDialog({ id, rubrique, lineCount }: { id: string; rubrique: string; lineCount: number }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RubriqueRenameFormValues>({
    resolver: zodResolver(rubriqueRenameFormSchema),
    defaultValues: { rubrique },
  });

  const onSubmit = async (values: RubriqueRenameFormValues) => {
    const result = await updateAllowedRubrique(id, values.rubrique);
    if (result.success) {
      toast.success("Catégorie renommée.");
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
        if (v) reset({ rubrique });
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Modifier ${rubrique}`} />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer « {rubrique} »</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            label="Catégorie"
            htmlFor="rubrique"
            required
            error={errors.rubrique?.message}
          >
            <Input id="rubrique" {...register("rubrique")} />
          </Field>
          {lineCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {lineCount} ligne{lineCount > 1 ? "s" : ""} budgétaire{lineCount > 1 ? "s" : ""} et les dépenses
              correspondantes seront mises à jour avec le nouveau nom.
            </p>
          )}
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
