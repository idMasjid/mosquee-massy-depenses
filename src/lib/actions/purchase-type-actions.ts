"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import type { ActionResult } from "@/lib/actions/expense-actions";

export type CreatePurchaseTypeResult =
  | { success: true; purchaseType: { id: string; name: string } }
  | { success: false; error: string };

export async function createPurchaseType(name: string): Promise<CreatePurchaseTypeResult> {
  await requireRole(["ADMIN", "IT"]);
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Le nom est requis." };

  try {
    const purchaseType = await prisma.purchaseType.create({ data: { name: trimmed } });
    revalidatePath("/admin/purchase-types");
    revalidatePath("/expenses/new");
    return { success: true, purchaseType: { id: purchaseType.id, name: purchaseType.name } };
  } catch {
    return { success: false, error: "Ce type d'achat existe déjà." };
  }
}

// Renames a purchase type and cascades the new name to every existing expense
// that used the old one, so the list and the actual data never drift apart.
export async function updatePurchaseType(id: string, rawName: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const newName = typeof rawName === "string" ? rawName.trim() : "";
  if (!newName) return { success: false, error: "Le nom est requis." };

  const current = await prisma.purchaseType.findUnique({ where: { id } });
  if (!current) return { success: false, error: "Type d'achat introuvable." };
  if (current.name === newName) return { success: true };

  try {
    await prisma.$transaction([
      prisma.purchaseType.update({ where: { id }, data: { name: newName } }),
      prisma.expense.updateMany({ where: { purchaseType: current.name }, data: { purchaseType: newName } }),
    ]);
  } catch {
    return { success: false, error: "Ce type d'achat existe déjà." };
  }

  revalidatePath("/admin/purchase-types");
  revalidatePath("/expenses");
  return { success: true };
}

export async function deletePurchaseType(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const existing = await prisma.purchaseType.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Type d'achat introuvable." };
  }
  await prisma.purchaseType.delete({ where: { id } });
  revalidatePath("/admin/purchase-types");
  return { success: true };
}
