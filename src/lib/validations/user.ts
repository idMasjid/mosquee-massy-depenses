import { z } from "zod";
import { ROLES } from "@/lib/constants";

export const userFormSchema = z.object({
  email: z.email({ error: "Adresse email invalide." }),
  name: z.string().min(1, { error: "Le nom est requis." }),
  role: z.enum(ROLES),
  password: z.string().min(8, { error: "Le mot de passe doit contenir au moins 8 caractères." }),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(ROLES),
  isActive: z.boolean(),
  newPassword: z.union([z.string().min(8, { error: "Au moins 8 caractères." }), z.literal("")]).optional(),
});

export type UserUpdateValues = z.infer<typeof userUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Mot de passe actuel requis." }),
    newPassword: z.string().min(8, { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." }),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
