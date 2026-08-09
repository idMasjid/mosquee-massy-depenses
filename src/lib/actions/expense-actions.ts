"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/rbac";
import { storage } from "@/lib/storage";
import { toCents } from "@/lib/money";
import { canCreateWithStatus, canTransition, transitionRequiresNote } from "@/lib/workflow";
import { expenseFormSchema, transitionSchema, type ExpenseFormValues } from "@/lib/validations/expense";
import type { ExpenseStatus } from "@/lib/constants";

export type ActionResult = { success: true } | { success: false; error: string };

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

  const canEdit =
    session.user.role === "ADMIN" ||
    (session.user.role === "IT" && ["IMPORT_A_VALIDER", "A_VENIR", "EN_ATTENTE", "REJETE"].includes(expense.status));
  if (!canEdit) {
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
  const data: Record<string, unknown> = { status: toStatus };
  if (toStatus === "EN_ATTENTE") data.submittedAt = now;
  if (toStatus === "VALIDE") {
    data.validatedById = session.user.id;
    data.validatedAt = now;
  }
  if (toStatus === "REJETE") {
    data.rejectedById = session.user.id;
    data.rejectedAt = now;
    data.rejectionReason = note;
  }
  if (toStatus === "REALISE") data.realizedAt = now;
  if (toStatus === "ANNULE") {
    data.cancelledById = session.user.id;
    data.cancelledAt = now;
    data.cancellationReason = note;
  }

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
