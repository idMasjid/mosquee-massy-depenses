"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  parseCsvRows,
  parseXlsxRows,
  mapRowToExpenseInput,
  MAX_IMPORT_FILE_SIZE_BYTES,
  ALLOWED_IMPORT_EXTENSIONS,
} from "@/lib/import/expense-import";

export type ImportResult =
  | { success: true; imported: number; skipped: number; errors: string[] }
  | { success: false; error: string };

const MAX_ERRORS_DISPLAYED = 50;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

// A single invoice commonly covers several distinct line items (one per
// product) — keying on supplier+invoice number alone would flag every line
// after the first as a duplicate of it, so the product and amount must also
// match for two rows to really be the same line re-imported.
function invoiceKey(supplierName: string, invoiceNumber: string, productTitle: string, totalTTCCents: number): string {
  return `${normalize(supplierName)}::${normalize(invoiceNumber)}::${normalize(productTitle)}::${totalTTCCents}`;
}

// Fallback signature for rows without an invoice number — same supplier, same
// day, same amount and same product is close enough to "the same expense" to
// treat a re-import of the same file as a duplicate rather than creating a copy.
function fingerprintKey(supplierName: string, entryDate: Date, totalTTCCents: number, productTitle: string): string {
  return `${normalize(supplierName)}::${entryDate.toISOString().slice(0, 10)}::${totalTTCCents}::${normalize(productTitle)}`;
}

export async function importExpenses(formData: FormData): Promise<ImportResult> {
  const session = await requireRole(["ADMIN", "IT"]);
  const file = formData.get("file");

  if (!(file instanceof File) || !file.name) {
    return { success: false, error: "Aucun fichier sélectionné." };
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_IMPORT_EXTENSIONS.includes(extension)) {
    return { success: false, error: "Format non pris en charge (fichiers .csv ou .xlsx uniquement)." };
  }
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    return { success: false, error: "Fichier trop volumineux (max 5 Mo)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rows;
  try {
    rows = extension === ".xlsx" ? await parseXlsxRows(buffer) : parseCsvRows(buffer);
  } catch {
    return { success: false, error: "Impossible de lire ce fichier. Vérifiez qu'il n'est pas corrompu." };
  }

  if (rows.length === 0) {
    return { success: false, error: "Aucune ligne de données trouvée dans ce fichier." };
  }

  const [activeProjects, allowedRubriques, suppliers, paymentTypes, purchaseTypes, existingExpenses] =
    await Promise.all([
      prisma.project.findMany({ select: { id: true, name: true } }),
      prisma.allowedRubrique.findMany({ select: { projectId: true, rubrique: true } }),
      prisma.supplier.findMany({ select: { name: true } }),
      prisma.paymentType.findMany({ select: { name: true } }),
      prisma.purchaseType.findMany({ select: { name: true } }),
      prisma.expense.findMany({
        select: { supplierName: true, invoiceNumber: true, entryDate: true, totalTTCCents: true, productTitle: true },
      }),
    ]);
  const projectIdByNormalizedName = new Map(activeProjects.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const allowedRubriqueByProjectAndName = new Map(
    allowedRubriques.map((r) => [`${r.projectId}::${r.rubrique.trim().toLowerCase()}`, r.rubrique]),
  );
  const supplierByNormalizedName = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s.name]));
  const paymentTypeByNormalizedName = new Map(paymentTypes.map((p) => [p.name.trim().toLowerCase(), p.name]));
  const purchaseTypeByNormalizedName = new Map(purchaseTypes.map((p) => [p.name.trim().toLowerCase(), p.name]));

  const seenByInvoice = new Set<string>();
  const seenByFingerprint = new Set<string>();
  for (const e of existingExpenses) {
    if (e.invoiceNumber) seenByInvoice.add(invoiceKey(e.supplierName, e.invoiceNumber, e.productTitle, e.totalTTCCents));
    seenByFingerprint.add(fingerprintKey(e.supplierName, e.entryDate, e.totalTTCCents, e.productTitle));
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +1 for 1-indexing, +1 for the header row
    const result = await mapRowToExpenseInput(
      rows[i],
      rowNumber,
      projectIdByNormalizedName,
      allowedRubriqueByProjectAndName,
      supplierByNormalizedName,
      paymentTypeByNormalizedName,
      purchaseTypeByNormalizedName,
    );
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }

    const { data } = result;
    const isDuplicate = data.invoiceNumber
      ? seenByInvoice.has(invoiceKey(data.supplierName, data.invoiceNumber, data.productTitle, data.totalTTCCents))
      : seenByFingerprint.has(fingerprintKey(data.supplierName, data.entryDate, data.totalTTCCents, data.productTitle));
    if (isDuplicate) {
      errors.push(`Ligne ${rowNumber} : doublon détecté (dépense déjà importée pour ce fournisseur), ligne ignorée.`);
      continue;
    }

    let expense;
    try {
      expense = await prisma.expense.create({
        data: {
          status: "IMPORT_A_VALIDER",
          createdById: session.user.id,
          ...data,
        },
      });
    } catch (err) {
      console.error(`Import "${file.name}" ligne ${rowNumber} : échec de création en base`, err);
      errors.push(`Ligne ${rowNumber} : erreur lors de l'enregistrement en base, ligne ignorée.`);
      continue;
    }

    try {
      await prisma.expenseStatusEvent.create({
        data: {
          expenseId: expense.id,
          fromStatus: null,
          toStatus: "IMPORT_A_VALIDER",
          note: `Import fichier (${file.name})`,
          byUserId: session.user.id,
        },
      });
    } catch (err) {
      // The expense itself was created successfully — only its status-history
      // entry failed to log, which isn't worth aborting or discarding the row for.
      console.error(`Import "${file.name}" ligne ${rowNumber} : échec de l'historique de statut`, err);
    }

    if (data.invoiceNumber) seenByInvoice.add(invoiceKey(data.supplierName, data.invoiceNumber, data.productTitle, data.totalTTCCents));
    seenByFingerprint.add(fingerprintKey(data.supplierName, data.entryDate, data.totalTTCCents, data.productTitle));
    imported++;
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");

  return { success: true, imported, skipped: errors.length, errors: errors.slice(0, MAX_ERRORS_DISPLAYED) };
}
