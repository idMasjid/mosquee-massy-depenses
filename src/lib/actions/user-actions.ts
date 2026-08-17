"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/password";
import { userFormSchema, userUpdateSchema, changePasswordSchema } from "@/lib/validations/user";
import type { ActionResult } from "@/lib/actions/expense-actions";

export async function createUser(raw: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const parsed = userFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { email, name, role, password } = parsed.data;

  try {
    await prisma.user.create({
      data: { email, name, role, isActive: true, passwordHash: hashPassword(password) },
    });
  } catch {
    return { success: false, error: "Un utilisateur avec cet email existe déjà." };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(raw: unknown): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"]);
  const parsed = userUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { id, name, role, isActive, newPassword } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Utilisateur introuvable." };
  }

  const isDemotingOrDeactivatingSelf = id === session.user.id && (role !== "ADMIN" || !isActive);
  if (isDemotingOrDeactivatingSelf) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      return { success: false, error: "Impossible: vous êtes le dernier administrateur actif." };
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      isActive,
      // Un enregistrement via ce formulaire vaut décision admin (approbation
      // si isActive, refus sinon) : la demande n'est plus "en attente".
      isPending: false,
      ...(newPassword ? { passwordHash: hashPassword(newPassword) } : {}),
    },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function changeOwnPassword(raw: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { currentPassword, newPassword } = parsed.data;

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
    return { success: false, error: "Mot de passe actuel incorrect." };
  }

  await prisma.user.update({ where: { id: dbUser.id }, data: { passwordHash: hashPassword(newPassword) } });
  return { success: true };
}
