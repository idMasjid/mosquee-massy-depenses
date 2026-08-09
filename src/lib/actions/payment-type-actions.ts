"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import type { ActionResult } from "@/lib/actions/expense-actions";

export type CreatePaymentTypeResult =
  | { success: true; paymentType: { id: string; name: string } }
  | { success: false; error: string };

export async function createPaymentType(name: string): Promise<CreatePaymentTypeResult> {
  await requireRole(["ADMIN", "IT"]);
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Le nom est requis." };

  try {
    const paymentType = await prisma.paymentType.create({ data: { name: trimmed } });
    revalidatePath("/admin/payment-types");
    revalidatePath("/expenses/new");
    return { success: true, paymentType: { id: paymentType.id, name: paymentType.name } };
  } catch {
    return { success: false, error: "Ce type de paiement existe déjà." };
  }
}

// Renames a payment type and cascades the new name to every existing expense
// that used the old one, so the list and the actual data never drift apart.
export async function updatePaymentType(id: string, rawName: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const newName = typeof rawName === "string" ? rawName.trim() : "";
  if (!newName) return { success: false, error: "Le nom est requis." };

  const current = await prisma.paymentType.findUnique({ where: { id } });
  if (!current) return { success: false, error: "Type de paiement introuvable." };
  if (current.name === newName) return { success: true };

  try {
    await prisma.$transaction([
      prisma.paymentType.update({ where: { id }, data: { name: newName } }),
      prisma.expense.updateMany({ where: { paymentType: current.name }, data: { paymentType: newName } }),
    ]);
  } catch {
    return { success: false, error: "Ce type de paiement existe déjà." };
  }

  revalidatePath("/admin/payment-types");
  revalidatePath("/expenses");
  return { success: true };
}

export async function deletePaymentType(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  await prisma.paymentType.delete({ where: { id } });
  revalidatePath("/admin/payment-types");
  return { success: true };
}
