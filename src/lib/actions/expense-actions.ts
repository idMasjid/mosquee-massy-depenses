"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/rbac";
import { storage } from "@/lib/storage";
import { toCents } from "@/lib/money";
import { canCreateWithStatus, canTransition, transitionRequiresNote } from "@/lib/workflow";
import { expenseFormSchema, transitionSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import type { ExpenseStatus, Role, BulkReassignField } from "@/lib/constants";
import { BULK_REASSIGN_FIELDS } from "@/lib/constants";

export type ActionResult = { success: true } | { success: false; error: string };
export type BulkActionResult = { success: true; updated: number; skipped: number } | { success: false; error: string };
export type BulkDeleteResult = { success: true; deleted: number } | { success: false; error: string };

// ADMIN can always edit; IT only while the expense hasn't moved past the
// stages it's responsible for. Shared by the single and bulk edit paths.
function canEditExpense(role: Role, status: string): boolean {
  return role === "ADMIN" || (role === "IT" && ["IMPORT_A_VALIDER", "A_VENIR", "EN_ATTENTE", "REJETE"].includes(status));
}

// Field/actor bookkeeping for a status transition — shared by the single and
// bulk transition paths so they can never drift apart.
function buildTransitionData(toStatus: ExpenseStatus, userId: string, note: string | undefined, now: Date): Record<string, unknown> {
  const data: Record<string, unknown> = { status: toStatus };
  if (toStatus === "EN_ATTENTE") data.submittedAt = now;
  if (toStatus === "VALIDE") {
    data.validatedById = userId;
    data.validatedAt = now;
  }
  if (toStatus === "REJETE") {
    data.rejectedById = userId;
    data.rejectedAt = now;
    data.rejectionReason = note;
  }
  if (toStatus === "REALISE") data.realizedAt = now;
  if (toStatus === "ANNULE") {
    data.cancelledById = userId;
    data.cancelledAt = now;
    data.cancellationReason = note;
  }
  return data;
}

function computeCents(input: ExpenseFormValues) {
  const unitPriceHTCents = input.unitPriceHT != null ? toCents(input.unitPriceHT) : null;
  const deliveryFeeCents = toCents(input.deliveryFee ?? 0);
  const importFeeCents = toCents(input.importFee ?? 0);
  const discountCents = toCents(input.discount ?? 0);
  const totalHTCents = toCents(input.totalHT ?? 0);
  const totalTTCCents = toCents(input.totalTTC);
  const vatAmountCents = input.vatAmount != null ? toCents(input.vatAmount) : null;
  const vatRateBps = input.vatRate != null ? Math.round(input.vatRate * 100) : null;
  return {
    unitPriceHTCents,
    deliveryFeeCents,
    importFeeCents,
    discountCents,
    totalHTCents,
    totalTTCCents,
    vatAmountCents,
    vatRateBps,
  };
}

export async function createExpense(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = expenseFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const input = parsed.data;

  if (!canCreateWithStatus(session.user.role, input.status)) {
    return { success: false, error: "Vous n'êtes pas autorisé à créer une dépense avec ce statut." };
  }

  const cents = computeCents(input);

  const expense = await prisma.expense.create({
    data: {
      status: input.status,
      createdById: session.user.id,
      submittedAt: input.status === "EN_ATTENTE" ? new Date() : null,
      entryDate: new Date(input.entryDate),
      orderDate: input.orderDate ? new Date(input.orderDate) : null,
      supplierName: input.supplierName,
      supplierIdentifier: input.supplierIdentifier || null,
      orderNumber: input.orderNumber || null,
      purchaseType: input.purchaseType || null,
      invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null,
      invoiceNumber: input.invoiceNumber || null,
      invoiceLink: input.invoiceLink || null,
      quantity: input.quantity,
      productTitle: input.productTitle,
      rubriqueLabel: input.rubriqueLabel,
      paymentType: input.paymentType || null,
      paymentReference: input.paymentReference || null,
      projectId: input.projectId,
      budgetLineId: input.budgetLineId || null,
      ...cents,
    },
  });

  await prisma.expenseStatusEvent.create({
    data: {
      expenseId: expense.id,
      fromStatus: null,
      toStatus: input.status,
      note: "Création",
      byUserId: session.user.id,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect(`/expenses/${expense.id}`);
}

export async function updateExpense(id: string, raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return { success: false, error: "Dépense introuvable." };

  if (!canEditExpense(session.user.role, expense.status)) {
    return { success: false, error: "Cette dépense ne peut plus être modifiée." };
  }

  const parsed = expenseFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const input = parsed.data;
  const cents = computeCents(input);

  await prisma.expense.update({
    where: { id },
    data: {
      entryDate: new Date(input.entryDate),
      orderDate: input.orderDate ? new Date(input.orderDate) : null,
      supplierName: input.supplierName,
      supplierIdentifier: input.supplierIdentifier || null,
      orderNumber: input.orderNumber || null,
      purchaseType: input.purchaseType || null,
      invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null,
      invoiceNumber: input.invoiceNumber || null,
      invoiceLink: input.invoiceLink || null,
      quantity: input.quantity,
      productTitle: input.productTitle,
      rubriqueLabel: input.rubriqueLabel,
      paymentType: input.paymentType || null,
      paymentReference: input.paymentReference || null,
      projectId: input.projectId,
      budgetLineId: input.budgetLineId || null,
      ...cents,
    },
  });

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}`);
  revalidatePath("/dashboard");
  redirect(`/expenses/${id}`);
}

export async function transitionExpense(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = transitionSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Requête invalide." };
  }
  const { expenseId, toStatus, note } = parsed.data;

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) return { success: false, error: "Dépense introuvable." };

  const from = expense.status as ExpenseStatus;
  if (!canTransition(session.user.role, from, toStatus)) {
    return { success: false, error: "Cette transition n'est pas autorisée pour votre rôle." };
  }
  if (transitionRequiresNote(session.user.role, from, toStatus) && !note?.trim()) {
    return { success: false, error: "Une note est requise pour cette action." };
  }

  const now = new Date();
  const data = buildTransitionData(toStatus, session.user.id, note, now);

  await prisma.expense.update({ where: { id: expenseId }, data });
  await prisma.expenseStatusEvent.create({
    data: {
      expenseId,
      fromStatus: from,
      toStatus,
      note: note || null,
      byUserId: session.user.id,
    },
  });

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!expense) return { success: false, error: "Dépense introuvable." };

  await prisma.expense.delete({ where: { id } });
  await Promise.all(expense.attachments.map((a) => storage.delete(a.storedPath).catch(() => {})));

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect("/expenses");
}

// Bulk actions apply to whichever selected rows are actually eligible and
// report how many were skipped, rather than failing the whole batch — same
// partial-success philosophy as the CSV import.

export async function bulkTransitionExpenses(ids: string[], toStatus: ExpenseStatus, note?: string): Promise<BulkActionResult> {
  const session = await requireSession();
  if (ids.length === 0) return { success: false, error: "Aucune dépense sélectionnée." };

  const expenses = await prisma.expense.findMany({ where: { id: { in: ids } } });
  const now = new Date();
  let updated = 0;

  for (const expense of expenses) {
    const from = expense.status as ExpenseStatus;
    if (!canTransition(session.user.role, from, toStatus)) continue;
    if (transitionRequiresNote(session.user.role, from, toStatus) && !note?.trim()) continue;

    const data = buildTransitionData(toStatus, session.user.id, note, now);
    await prisma.expense.update({ where: { id: expense.id }, data });
    await prisma.expenseStatusEvent.create({
      data: { expenseId: expense.id, fromStatus: from, toStatus, note: note || null, byUserId: session.user.id },
    });
    updated++;
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true, updated, skipped: ids.length - updated };
}

export async function bulkReassignExpenses(ids: string[], field: BulkReassignField, rawValue: string): Promise<BulkActionResult> {
  const session = await requireRole(["ADMIN", "IT"]);
  if (ids.length === 0) return { success: false, error: "Aucune dépense sélectionnée." };
  if (!BULK_REASSIGN_FIELDS.includes(field)) return { success: false, error: "Champ invalide." };
  const value = rawValue.trim();
  if (!value) return { success: false, error: "Une valeur est requise." };

  const expenses = await prisma.expense.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
  let updated = 0;

  for (const expense of expenses) {
    if (!canEditExpense(session.user.role, expense.status)) continue;
    await prisma.expense.update({ where: { id: expense.id }, data: { [field]: value } });
    updated++;
  }

  revalidatePath("/expenses");
  return { success: true, updated, skipped: ids.length - updated };
}

export async function bulkDeleteExpenses(ids: string[]): Promise<BulkDeleteResult> {
  await requireRole(["ADMIN"]);
  if (ids.length === 0) return { success: false, error: "Aucune dépense sélectionnée." };

  const expenses = await prisma.expense.findMany({ where: { id: { in: ids } }, include: { attachments: true } });
  let deleted = 0;

  for (const expense of expenses) {
    await prisma.expense.delete({ where: { id: expense.id } });
    await Promise.all(expense.attachments.map((a) => storage.delete(a.storedPath).catch(() => {})));
    deleted++;
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true, deleted };
}
