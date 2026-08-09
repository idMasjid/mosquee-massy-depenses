"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import type { ActionResult } from "@/lib/actions/expense-actions";

export type CreateSupplierResult =
  | { success: true; supplier: { id: string; name: string } }
  | { success: false; error: string };

export async function createSupplier(name: string): Promise<CreateSupplierResult> {
  await requireRole(["ADMIN", "IT"]);
  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Le nom est requis." };

  try {
    const supplier = await prisma.supplier.create({ data: { name: trimmed } });
    revalidatePath("/admin/suppliers");
    revalidatePath("/expenses/new");
    return { success: true, supplier: { id: supplier.id, name: supplier.name } };
  } catch {
    return { success: false, error: "Ce fournisseur existe déjà." };
  }
}

// Renames a supplier and cascades the new name to every existing expense that
// used the old one, so the list and the actual data never drift apart.
export async function updateSupplier(id: string, rawName: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const newName = typeof rawName === "string" ? rawName.trim() : "";
  if (!newName) return { success: false, error: "Le nom est requis." };

  const current = await prisma.supplier.findUnique({ where: { id } });
  if (!current) return { success: false, error: "Fournisseur introuvable." };
  if (current.name === newName) return { success: true };

  try {
    await prisma.$transaction([
      prisma.supplier.update({ where: { id }, data: { name: newName } }),
      prisma.expense.updateMany({ where: { supplierName: current.name }, data: { supplierName: newName } }),
    ]);
  } catch {
    return { success: false, error: "Ce fournisseur existe déjà." };
  }

  revalidatePath("/admin/suppliers");
  revalidatePath("/expenses");
  return { success: true };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Fournisseur introuvable." };
  }
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/admin/suppliers");
  return { success: true };
}
