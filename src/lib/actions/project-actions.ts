"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import { toCents } from "@/lib/money";
import { projectFormSchema, budgetLineFormSchema, budgetLineUpdateSchema } from "@/lib/validations/project";
import type { ActionResult } from "@/lib/actions/expense-actions";

export type CreateProjectResult =
  | { success: true; project: { id: string; name: string } }
  | { success: false; error: string };

export async function createProject(raw: unknown): Promise<CreateProjectResult> {
  await requireRole(["ADMIN", "IT"]);
  const parsed = projectFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  let project;
  try {
    const last = await prisma.project.aggregate({
      _max: { order: true, dashboardOrder: true, rapportsOrder: true },
    });
    project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        order: (last._max.order ?? 0) + 10,
        dashboardOrder: (last._max.dashboardOrder ?? 0) + 10,
        rapportsOrder: (last._max.rapportsOrder ?? 0) + 10,
      },
    });
  } catch {
    return { success: false, error: "Un projet avec ce nom existe déjà." };
  }
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  return { success: true, project: { id: project.id, name: project.name } };
}

// Each page (Projets / Dashboard / Récapitulatif) has its own independent
// manual order — reordering on one page intentionally doesn't move things on
// another. Shared/global across users (not per-user), any active session may
// reorder.
export async function reorderProjects(orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.project.update({ where: { id }, data: { order: (index + 1) * 10 } })),
  );
  revalidatePath("/projects");
  return { success: true };
}

export async function reorderProjectsDashboard(orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.project.update({ where: { id }, data: { dashboardOrder: (index + 1) * 10 } }),
    ),
  );
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reorderProjectsRapports(orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.project.update({ where: { id }, data: { rapportsOrder: (index + 1) * 10 } }),
    ),
  );
  revalidatePath("/rapports");
  return { success: true };
}

export async function createBudgetLine(raw: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const parsed = budgetLineFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const input = parsed.data;

  const allowed = await prisma.allowedRubrique.findUnique({
    where: { projectId_rubrique: { projectId: input.projectId, rubrique: input.rubrique } },
  });
  if (!allowed) {
    return {
      success: false,
      error: "Cette catégorie n'est pas autorisée pour ce projet. Ajoutez-la d'abord dans Catégories.",
    };
  }

  // The @@unique([projectId, rubrique, productTitle]) constraint doesn't catch
  // this case: SQL treats every NULL productTitle as distinct, so the DB alone
  // would silently allow a second general (no product title) line for the same
  // projet/catégorie. Check explicitly instead of relying on the unique index.
  const duplicate = await prisma.budgetLine.findFirst({
    where: { projectId: input.projectId, rubrique: input.rubrique, productTitle: input.productTitle || null },
  });
  if (duplicate) {
    return { success: false, error: "Cette ligne budgétaire existe déjà pour ce projet." };
  }

  try {
    const last = await prisma.budgetLine.aggregate({
      where: { projectId: input.projectId },
      _max: { order: true, rapportsOrder: true },
    });
    await prisma.budgetLine.create({
      data: {
        projectId: input.projectId,
        rubrique: input.rubrique,
        productTitle: input.productTitle || null,
        budgetedAmountHTCents: toCents(input.budgetedAmountHT),
        notes: input.notes || null,
        order: (last._max.order ?? 0) + 10,
        rapportsOrder: (last._max.rapportsOrder ?? 0) + 10,
      },
    });
  } catch {
    return { success: false, error: "Cette ligne budgétaire existe déjà pour ce projet." };
  }
  revalidatePath("/projects");
  return { success: true };
}

// order = Projets page order; rapportsOrder = Récapitulatif page order
// (independent of each other). Shared/global (not per-user).
export async function reorderBudgetLines(projectId: string, orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.budgetLine.update({ where: { id, projectId }, data: { order: (index + 1) * 10 } }),
    ),
  );
  revalidatePath("/projects");
  return { success: true };
}

export async function reorderBudgetLinesRapports(projectId: string, orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.budgetLine.update({ where: { id, projectId }, data: { rapportsOrder: (index + 1) * 10 } }),
    ),
  );
  revalidatePath("/rapports");
  return { success: true };
}

export async function updateBudgetLine(id: string, raw: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const parsed = budgetLineUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const input = parsed.data;

  const current = await prisma.budgetLine.findUnique({ where: { id } });
  if (!current) {
    return { success: false, error: "Ligne budgétaire introuvable." };
  }

  const allowed = await prisma.allowedRubrique.findUnique({
    where: { projectId_rubrique: { projectId: current.projectId, rubrique: input.rubrique } },
  });
  if (!allowed) {
    return {
      success: false,
      error: "Cette catégorie n'est pas autorisée pour ce projet. Ajoutez-la d'abord dans Catégories.",
    };
  }

  const duplicate = await prisma.budgetLine.findFirst({
    where: {
      id: { not: id },
      projectId: current.projectId,
      rubrique: input.rubrique,
      productTitle: input.productTitle || null,
    },
  });
  if (duplicate) {
    return { success: false, error: "Une ligne budgétaire identique existe déjà pour ce projet." };
  }

  try {
    await prisma.budgetLine.update({
      where: { id },
      data: {
        rubrique: input.rubrique,
        productTitle: input.productTitle || null,
        budgetedAmountHTCents: toCents(input.budgetedAmountHT),
        notes: input.notes || null,
      },
    });
  } catch {
    return { success: false, error: "Une ligne budgétaire identique existe déjà pour ce projet." };
  }

  revalidatePath("/projects");
  revalidatePath("/rapports");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setProjectActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Projet introuvable." };
  }
  await prisma.project.update({ where: { id }, data: { isActive } });
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  revalidatePath("/expenses/new");
  return { success: true };
}

export async function deleteBudgetLine(id: string): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const expenseCount = await prisma.expense.count({ where: { budgetLineId: id } });
  if (expenseCount > 0) {
    return {
      success: false,
      error: "Impossible de supprimer : des dépenses sont reliées à cette ligne budgétaire. Archivez-la plutôt.",
    };
  }
  await prisma.budgetLine.delete({ where: { id } });
  revalidatePath("/projects");
  return { success: true };
}

export async function setBudgetLineActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const existing = await prisma.budgetLine.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Ligne budgétaire introuvable." };
  }
  await prisma.budgetLine.update({ where: { id }, data: { isActive } });
  revalidatePath("/projects");
  revalidatePath("/expenses/new");
  return { success: true };
}
