"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { userFormSchema, type UserFormValues } from "@/lib/validations/user";
import { createUser } from "@/lib/actions/user-actions";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export function NewUserDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({ resolver: zodResolver(userFormSchema), defaultValues: { role: "IT" } });

  const onSubmit = async (values: UserFormValues) => {
    const result = await createUser(values);
    if (result.success) {
      toast.success("Utilisateur ajouté. Communiquez-lui son mot de passe initial.");
      reset({ role: "IT", email: "", name: "", password: "" });
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Ajouter un utilisateur
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Email Google" htmlFor="email" required error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </Field>
          <Field label="Nom complet" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Field label="Mot de passe initial" htmlFor="password" required error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
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
