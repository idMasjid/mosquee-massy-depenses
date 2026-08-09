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

  const [activeProjects, allowedRubriques, suppliers, paymentTypes, purchaseTypes] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true } }),
    prisma.allowedRubrique.findMany({ select: { projectId: true, rubrique: true } }),
    prisma.supplier.findMany({ select: { name: true } }),
    prisma.paymentType.findMany({ select: { name: true } }),
    prisma.purchaseType.findMany({ select: { name: true } }),
  ]);
  const projectIdByNormalizedName = new Map(activeProjects.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const allowedRubriqueByProjectAndName = new Map(
    allowedRubriques.map((r) => [`${r.projectId}::${r.rubrique.trim().toLowerCase()}`, r.rubrique]),
  );
  const supplierByNormalizedName = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s.name]));
  const paymentTypeByNormalizedName = new Map(paymentTypes.map((p) => [p.name.trim().toLowerCase(), p.name]));
  const purchaseTypeByNormalizedName = new Map(purchaseTypes.map((p) => [p.name.trim().toLowerCase(), p.name]));

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

    const expense = await prisma.expense.create({
      data: {
        status: "IMPORT_A_VALIDER",
        createdById: session.user.id,
        ...result.data,
      },
    });
    await prisma.expenseStatusEvent.create({
      data: {
        expenseId: expense.id,
        fromStatus: null,
        toStatus: "IMPORT_A_VALIDER",
        note: `Import fichier (${file.name})`,
        byUserId: session.user.id,
      },
    });
    imported++;
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");

  return { success: true, imported, skipped: errors.length, errors: errors.slice(0, MAX_ERRORS_DISPLAYED) };
}
