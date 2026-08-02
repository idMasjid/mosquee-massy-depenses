"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { projectFormSchema, type ProjectFormValues } from "@/lib/validations/project";
import { createProject } from "@/lib/actions/project-actions";

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({ resolver: zodResolver(projectFormSchema) });

  const onSubmit = async (values: ProjectFormValues) => {
    const result = await createProject(values);
    if (result.success) {
      toast.success("Projet créé.");
      reset();
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-4" />
        Nouveau projet
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nom du projet" htmlFor="name" required error={errors.name?.message}>
            <Input id="name" {...register("name")} />
          </Field>
          <Field label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...register("description")} />
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
