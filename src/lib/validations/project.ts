import { z } from "zod";

export const projectFormSchema = z.object({
  name: z.string().min(1, { error: "Le nom du projet est requis." }),
  description: z.string().optional(),
});
export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const budgetLineFormSchema = z.object({
  projectId: z.string().min(1, { error: "Le projet est requis." }),
  rubrique: z.string().min(1, { error: "La rubrique est requise." }),
  productTitle: z.string().optional(),
  budgetedAmountHT: z.number({ error: "Le budget est requis." }).min(0),
  notes: z.string().optional(),
});
export type BudgetLineFormValues = z.infer<typeof budgetLineFormSchema>;

// Same shape minus projectId: a budget line's project is fixed once created,
// only its rubrique/produit/montant can be edited afterwards.
export const budgetLineUpdateSchema = budgetLineFormSchema.omit({ projectId: true });
export type BudgetLineUpdateValues = z.infer<typeof budgetLineUpdateSchema>;
