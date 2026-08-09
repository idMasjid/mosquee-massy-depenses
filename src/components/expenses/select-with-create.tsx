"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";

const CREATE_SENTINEL = "__create_new__";

export type SelectWithCreateOption = { id: string; name: string };
export type CreateOptionResult = { success: true; id: string; name: string } | { success: false; error: string };

export function SelectWithCreate({
  value,
  onValueChange,
  options,
  onOptionCreated,
  onCreate,
  placeholder,
  createLabel,
  dialogTitle,
  disabled,
}: {
  value: string;
  onValueChange: (name: string) => void;
  options: SelectWithCreateOption[];
  onOptionCreated: (option: SelectWithCreateOption) => void;
  onCreate: (name: string) => Promise<CreateOptionResult>;
  placeholder: string;
  createLabel: string;
  dialogTitle: string;
  disabled?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ defaultValues: { name: "" } });

  const handleSelect = (v: string | null) => {
    if (v === CREATE_SENTINEL) {
      setDialogOpen(true);
      return;
    }
    onValueChange(v ?? "");
  };

  const onCreateSubmit = async (values: { name: string }) => {
    const result = await onCreate(values.name);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onOptionCreated({ id: result.id, name: result.name });
    onValueChange(result.name);
    reset({ name: "" });
    setDialogOpen(false);
  };

  return (
    <>
      <Select
        items={{ [CREATE_SENTINEL]: createLabel, ...Object.fromEntries(options.map((o) => [o.name, o.name])) }}
        value={value}
        onValueChange={handleSelect}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CREATE_SENTINEL} className="font-medium text-primary">
            <Plus className="size-4" />
            {createLabel}
          </SelectItem>
          <SelectSeparator />
          {options.map((o) => (
            <SelectItem key={o.id} value={o.name}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (v) reset({ name: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="flex flex-col gap-4">
            <Field label="Nom" htmlFor="new-option-name" required error={errors.name?.message}>
              <Input id="new-option-name" autoFocus {...register("name", { required: "Le nom est requis." })} />
            </Field>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Annuler</DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
