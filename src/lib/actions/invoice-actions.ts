"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { requireRole } from "@/lib/rbac";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/storage";

const InvoiceDataSchema = z.object({
  supplierName: z.string().nullable(),
  productTitle: z.string().nullable(),
  orderDate: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  orderNumber: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  unitPriceHT: z.number().nullable(),
  quantity: z.number().nullable(),
  deliveryFee: z.number().nullable(),
  importFee: z.number().nullable(),
  discount: z.number().nullable(),
  totalHT: z.number().nullable(),
  vatRate: z.number().nullable(),
  vatAmount: z.number().nullable(),
  totalTTC: z.number().nullable(),
  paymentType: z.string().nullable(),
  paymentReference: z.string().nullable(),
});

export type InvoiceData = z.infer<typeof InvoiceDataSchema>;

export type ExtractInvoiceResult = { success: true; data: InvoiceData } | { success: false; error: string };

const client = new Anthropic();

const EXTRACTION_PROMPT =
  "Voici une facture ou un bon de commande. Extrais les champs demandés par le schéma. Les montants " +
  "doivent être des nombres en euros (sans symbole), avec un point comme séparateur décimal. Les dates au " +
  "format AAAA-MM-JJ. Le taux de TVA est un pourcentage (ex. 20 pour 20%). Si un champ n'est pas présent sur " +
  "le document, renvoie null pour ce champ — n'invente rien.";

export async function extractInvoiceData(formData: FormData): Promise<ExtractInvoiceResult> {
  await requireRole(["ADMIN", "IT"]);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Aucun fichier sélectionné." };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return { success: false, error: "Type de fichier non autorisé (PDF ou image uniquement)." };
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { success: false, error: "Fichier trop volumineux (max 10 Mo)." };
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const fileBlock =
    file.type === "application/pdf"
      ? ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        } as const)
      : ({
          type: "image",
          source: { type: "base64", media_type: file.type as "image/png" | "image/jpeg" | "image/webp", data: base64 },
        } as const);

  try {
    const message = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2048,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: EXTRACTION_PROMPT }],
        },
      ],
      output_config: {
        format: zodOutputFormat(InvoiceDataSchema),
      },
    });

    if (message.stop_reason === "refusal") {
      return { success: false, error: "La lecture de ce document a été refusée par l'IA." };
    }
    if (!message.parsed_output) {
      return { success: false, error: "Impossible d'extraire les informations de ce document." };
    }

    return { success: true, data: message.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { success: false, error: "Clé API Anthropic manquante ou invalide (variable ANTHROPIC_API_KEY)." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { success: false, error: "Trop de requêtes vers l'IA, réessayez dans quelques instants." };
    }
    if (error instanceof Anthropic.APIError) {
      return { success: false, error: `Erreur IA : ${error.message}` };
    }
    // The SDK throws a plain Error (not an Anthropic.APIError) before even
    // sending the request when no credentials are configured at all.
    if (error instanceof Error && /authentication method|api ?key/i.test(error.message)) {
      return { success: false, error: "Clé API Anthropic manquante ou invalide (variable ANTHROPIC_API_KEY)." };
    }
    console.error("extractInvoiceData failed:", error);
    return { success: false, error: "Impossible de lire ce document." };
  }
}
