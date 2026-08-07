import { z } from "zod";
import { EXPENSE_STATUSES } from "@/lib/constants";

export const expenseFormSchema = z.object({
  status: z.enum(EXPENSE_STATUSES),
  entryDate: z.string().min(1, { error: "La date de saisie est requise." }),
  orderDate: z.string().optional(),
  supplierName: z.string().min(1, { error: "Le fournisseur est requis." }),
  supplierIdentifier: z.string().optional(),
  orderNumber: z.string().optional(),
  purchaseType: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceLink: z.string().optional(),
  unitPriceHT: z.number().optional(),
  quantity: z.number().min(0),
  deliveryFee: z.number(),
  importFee: z.number(),
  discount: z.number(),
  totalHT: z.number().optional(),
  vatRate: z.number().optional(),
  vatAmount: z.number().optional(),
  totalTTC: z.number({ error: "Le total TTC est requis." }),
  paymentType: z.string().optional(),
  paymentReference: z.string().optional(),
  productTitle: z.string().min(1, { error: "Le titre du produit est requis." }),
  projectId: z.string().min(1, { error: "Le projet est requis." }),
  budgetLineId: z.string().optional(),
  rubriqueLabel: z.string().min(1, { error: "La catégorie est requise." }),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const transitionSchema = z.object({
  expenseId: z.string().min(1),
  toStatus: z.enum(EXPENSE_STATUSES),
  note: z.string().optional(),
});

export type TransitionValues = z.infer<typeof transitionSchema>;
