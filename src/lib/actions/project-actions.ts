"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { toCents } from "@/lib/money";
import { projectFormSchema, budgetLineFormSchema } from "@/lib/validations/project";
import type { ActionResult } from "@/lib/actions/expense-actions";

export async function createProject(raw: unknown): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  const parsed = projectFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  try {
    await prisma.project.create({
      data: { name: parsed.data.name, description: parsed.data.description || null },
    });
  } catch {
    return { success: false, error: "Un projet avec ce nom existe déjà." };
  }
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
      error: "Cette rubrique n'est pas autorisée pour ce projet. Ajoutez-la d'abord dans Rubriques.",
    };
  }

  try {
    await prisma.budgetLine.create({
      data: {
        projectId: input.projectId,
        rubrique: input.rubrique,
        productTitle: input.productTitle || null,
        budgetedAmountHTCents: toCents(input.budgetedAmountHT),
        notes: input.notes || null,
      },
    });
  } catch {
    return { success: false, error: "Cette ligne budgétaire existe déjà pour ce projet." };
  }
  revalidatePath("/projects");
  return { success: true };
}

export async function updateBudgetLineAmount(id: string, budgetedAmountHT: number): Promise<ActionResult> {
  await requireRole(["ADMIN", "IT"]);
  await prisma.budgetLine.update({
    where: { id },
    data: { budgetedAmountHTCents: toCents(budgetedAmountHT) },
  });
  revalidatePath("/projects");
  return { success: true };
}
