import { z } from "zod";

// Shared by the Fournisseurs / Types de paiement / Types d'achat admin
// screens (LookupTableManager) — all three are plain name-only lookups.
export const lookupNameFormSchema = z.object({
  name: z.string().min(1, { error: "Le nom est requis." }),
});
export type LookupNameFormValues = z.infer<typeof lookupNameFormSchema>;
