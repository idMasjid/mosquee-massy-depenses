import { z } from "zod";

export const allowedRubriqueFormSchema = z.object({
  projectId: z.string().min(1, { error: "Le projet est requis." }),
  rubrique: z.string().min(1, { error: "La catégorie est requise." }),
});
export type AllowedRubriqueFormValues = z.infer<typeof allowedRubriqueFormSchema>;
