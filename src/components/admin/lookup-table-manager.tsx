"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Field } from "@/components/form/field";
import { lookupNameFormSchema, type LookupNameFormValues } from "@/lib/validations/lookup";

export type LookupItem = { id: string; name: string; usageCount: number };
export type LookupActionResult = { success: true } | { success: false; error: string };

export function LookupTableManager({
  items,
  entityLabel,
  entityLabelCapitalized,
  createAction,
  updateAction,
  deleteAction,
}: {
  items: LookupItem[];
  entityLabel: string;
  entityLabelCapitalized: string;
  createAction: (name: string) => Promise<LookupActionResult>;
  updateAction: (id: string, name: string) => Promise<LookupActionResult>;
  deleteAction: (id: string) => Promise<LookupActionResult>;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <h2 className="font-semibold">{entityLabelCapitalized}s</h2>
        <NewLookupItemDialog entityLabel={entityLabel} entityLabelCapitalized={entityLabelCapitalized} createAction={createAction} />
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Aucun {entityLabel} pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                {item.name}
                {item.usageCount > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({item.usageCount} dépense{item.usageCount > 1 ? "s" : ""})
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <EditLookupItemDialog item={item} entityLabelCapitalized={entityLabelCapitalized} updateAction={updateAction} />
                <DeleteLookupItemButton item={item} entityLabel={entityLabel} deleteAction={deleteAction} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewLookupItemDialog({
  entityLabel,
  entityLabelCapitalized,
  createAction,
}: {
  entityLabel: string;
  entityLabelCapitalized: string;
  createAction: (name: string) => Promise<LookupActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LookupNameFormValues>({ resolver: zodResolver(lookupNameFormSchema), defaultValues: { name: "" } });

  const onSubmit = async (values: LookupNameFormValues) => {
    const result = await createAction(values.name);
    if (result.success) {
      toast.success(`${entityLabelCapitalized} ajouté.`);
      reset({ name: "" });
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nouveau {entityLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau {entityLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nom" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" autoFocus {...register("name")} />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Annuler</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditLookupItemDialog({
  item,
  entityLabelCapitalized,
  updateAction,
}: {
  item: LookupItem;
  entityLabelCapitalized: string;
  updateAction: (id: string, name: string) => Promise<LookupActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LookupNameFormValues>({
    resolver: zodResolver(lookupNameFormSchema),
    defaultValues: { name: item.name },
  });

  const onSubmit = async (values: LookupNameFormValues) => {
    const result = await updateAction(item.id, values.name);
    if (result.success) {
      toast.success(`${entityLabelCapitalized} renommé.`);
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
        if (v) reset({ name: item.name });
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Modifier ${item.name}`} />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renommer « {item.name} »</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nom" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          {item.usageCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {item.usageCount} dépense{item.usageCount > 1 ? "s" : ""} existante{item.usageCount > 1 ? "s" : ""} sera
              {item.usageCount > 1 ? "nt" : ""} mise{item.usageCount > 1 ? "s" : ""} à jour avec le nouveau nom.
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

function DeleteLookupItemButton({
  item,
  entityLabel,
  deleteAction,
}: {
  item: LookupItem;
  entityLabel: string;
  deleteAction: (id: string) => Promise<LookupActionResult>;
}) {
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await deleteAction(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${item.name} supprimé.`);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${item.name}`} disabled={pending} />}>
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {item.name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            {item.usageCount > 0
              ? `${item.usageCount} dépense${item.usageCount > 1 ? "s" : ""} existante${item.usageCount > 1 ? "s" : ""} utilise${item.usageCount > 1 ? "nt" : ""} déjà ce ${entityLabel} et ne sera${item.usageCount > 1 ? "" : "z"} pas affectée${item.usageCount > 1 ? "s" : ""}. Il ne sera simplement plus proposé pour de nouvelles dépenses.`
              : "Il ne sera plus proposé pour de nouvelles dépenses."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={pending}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
