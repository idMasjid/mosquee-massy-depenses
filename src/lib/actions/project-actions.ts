"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/rbac";
import { toCents } from "@/lib/money";
import { projectFormSchema, budgetLineFormSchema, budgetLineUpdateSchema } from "@/lib/validations/project";
import type { ActionResult } from "@/lib/actions/expense-actions";

export async function createProject(raw: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const parsed = projectFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  try {
    const last = await prisma.project.findFirst({ orderBy: { order: "desc" } });
    await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        order: (last?.order ?? 0) + 10,
      },
    });
  } catch {
    return { success: false, error: "Un projet avec ce nom existe déjà." };
  }
  revalidatePath("/projects");
  return { success: true };
}

// Persists a manual drag-and-drop order for the project list. Shared/global
// (not per-user) since it's a display order for the whole list, not a
// personal preference — any active session may reorder.
export async function reorderProjects(orderedIds: string[]): Promise<ActionResult> {
  await requireSession();
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.project.update({ where: { id }, data: { order: (index + 1) * 10 } })),
  );
  revalidatePath("/projects");
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

  try {
    const last = await prisma.budgetLine.findFirst({
      where: { projectId: input.projectId },
      orderBy: { order: "desc" },
    });
    await prisma.budgetLine.create({
      data: {
        projectId: input.projectId,
        rubrique: input.rubrique,
        productTitle: input.productTitle || null,
        budgetedAmountHTCents: toCents(input.budgetedAmountHT),
        notes: input.notes || null,
        order: (last?.order ?? 0) + 10,
      },
    });
  } catch {
    return { success: false, error: "Cette ligne budgétaire existe déjà pour ce projet." };
  }
  revalidatePath("/projects");
  return { success: true };
}

// Persists a manual drag-and-drop order for the budget lines of a single
// project. Shared/global (not per-user), any active session may reorder.
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
  await prisma.project.update({ where: { id }, data: { isActive } });
  revalidatePath("/projects");
  revalidatePath("/expenses/new");
  return { success: true };
}

export async function setBudgetLineActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  await prisma.budgetLine.update({ where: { id }, data: { isActive } });
  revalidatePath("/projects");
  revalidatePath("/expenses/new");
  return { success: true };
}
