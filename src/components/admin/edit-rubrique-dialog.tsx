"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { updateAllowedRubrique } from "@/lib/actions/rubrique-actions";

export function EditRubriqueDialog({ id, rubrique, lineCount }: { id: string; rubrique: string; lineCount: number }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ rubrique: string }>({ defaultValues: { rubrique } });

  const onSubmit = async (values: { rubrique: string }) => {
    const result = await updateAllowedRubrique(id, values.rubrique);
    if (result.success) {
      toast.success("Rubrique renommée.");
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
            label="Rubrique"
            htmlFor="rubrique"
            required
            error={errors.rubrique?.message}
          >
            <Input id="rubrique" {...register("rubrique", { required: "La rubrique est requise." })} />
          </Field>
          {lineCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {lineCount} ligne{lineCount > 1 ? "s" : ""} budgétaire{lineCount > 1 ? "s" : ""} et les dépenses
              correspondantes seront mises à jour avec le nouveau nom.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
