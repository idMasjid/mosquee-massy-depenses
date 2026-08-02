"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validations/user";
import { changeOwnPassword } from "@/lib/actions/user-actions";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = async (values: ChangePasswordValues) => {
    const result = await changeOwnPassword(values);
    if (result.success) {
      toast.success("Mot de passe mis à jour.");
      reset();
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <DropdownMenuItem onClick={() => setOpen(true)} closeOnClick={false}>
        <KeyRound className="size-4" />
        Changer mon mot de passe
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer mon mot de passe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Field label="Mot de passe actuel" htmlFor="currentPassword" required error={errors.currentPassword?.message}>
              <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
            </Field>
            <Field label="Nouveau mot de passe" htmlFor="newPassword" required error={errors.newPassword?.message}>
              <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                Mettre à jour
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
