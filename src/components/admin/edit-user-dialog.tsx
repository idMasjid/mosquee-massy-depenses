"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { userUpdateSchema, type UserUpdateValues } from "@/lib/validations/user";
import { updateUser } from "@/lib/actions/user-actions";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export function EditUserDialog({
  user,
}: {
  user: { id: string; name: string; email: string; role: (typeof ROLES)[number]; isActive: boolean };
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserUpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { id: user.id, name: user.name, role: user.role, isActive: user.isActive, newPassword: "" },
  });

  const onSubmit = async (values: UserUpdateValues) => {
    const result = await updateUser(values);
    if (result.success) {
      toast.success("Utilisateur mis à jour.");
      reset({ ...values, newPassword: "" });
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Modifier" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier {user.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nom complet" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Field label="Équipe / rôle" required error={errors.role?.message}>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(ROLES.map((r) => [r, ROLE_LABELS[r]]))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            label="Réinitialiser le mot de passe (optionnel)"
            htmlFor="newPassword"
            error={errors.newPassword?.message}
          >
            <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
          </Field>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                Compte actif (peut se connecter)
              </label>
            )}
          />
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
