"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import { allowedRubriqueFormSchema } from "@/lib/validations/rubrique";
import type { ActionResult } from "@/lib/actions/expense-actions";

export async function createAllowedRubrique(raw: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const parsed = allowedRubriqueFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  try {
    const last = await prisma.allowedRubrique.aggregate({
      where: { projectId: parsed.data.projectId },
      _max: { order: true, dashboardOrder: true },
    });
    await prisma.allowedRubrique.create({
      data: {
        ...parsed.data,
        order: (last._max.order ?? 0) + 10,
        dashboardOrder: (last._max.dashboardOrder ?? 0) + 10,
      },
    });
  } catch {
    return { success: false, error: "Cette catégorie est déjà autorisée pour ce projet." };
  }
  revalidatePath("/admin/rubriques");
  return { success: true };
}

// order = Admin > Catégories page order; dashboardOrder = "Budget par
// catégorie" panel order (independent of each other). Shared/global (not
// per-user), any active session may reorder.
export async function reorderRubriques(projectId: string, orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.allowedRubrique.update({ where: { id, projectId }, data: { order: (index + 1) * 10 } }),
    ),
  );
  revalidatePath("/admin/rubriques");
  return { success: true };
}

export async function reorderRubriquesDashboard(projectId: string, orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.allowedRubrique.update({ where: { id, projectId }, data: { dashboardOrder: (index + 1) * 10 } }),
    ),
  );
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAllowedRubrique(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  await prisma.allowedRubrique.delete({ where: { id } });
  revalidatePath("/admin/rubriques");
  return { success: true };
}

// Renames a rubrique and cascades the new label to every existing budget line
// and expense that used the old one, so the taxonomy and the actual data never
// drift apart.
export async function updateAllowedRubrique(id: string, rawRubrique: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const parsed = allowedRubriqueFormSchema.shape.rubrique.safeParse(rawRubrique);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Catégorie invalide." };
  }
  const newRubrique = parsed.data;

  const current = await prisma.allowedRubrique.findUnique({ where: { id } });
  if (!current) {
    return { success: false, error: "Catégorie introuvable." };
  }
  if (current.rubrique === newRubrique) {
    return { success: true };
  }

  try {
    await prisma.$transaction([
      prisma.allowedRubrique.update({ where: { id }, data: { rubrique: newRubrique } }),
      prisma.budgetLine.updateMany({
        where: { projectId: current.projectId, rubrique: current.rubrique },
        data: { rubrique: newRubrique },
      }),
      prisma.expense.updateMany({
        where: { projectId: current.projectId, rubriqueLabel: current.rubrique },
        data: { rubriqueLabel: newRubrique },
      }),
    ]);
  } catch {
    return { success: false, error: "Cette catégorie est déjà autorisée pour ce projet." };
  }

  revalidatePath("/admin/rubriques");
  revalidatePath("/projects");
  revalidatePath("/expenses");
  revalidatePath("/rapports");
  return { success: true };
}
