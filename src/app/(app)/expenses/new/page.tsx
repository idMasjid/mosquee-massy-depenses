import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { CREATE_STATUSES } from "@/lib/workflow";
import { ExpenseForm } from "@/components/expenses/expense-form";
import type { ExpenseStatus } from "@/lib/constants";

export default async function NewExpensePage() {
  const session = await requireRole(["ADMIN", "IT"]);

  const [projects, budgetLines, suppliers, paymentTypes, purchaseTypes] = await Promise.all([
    prisma.project.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.budgetLine.findMany({ where: { isActive: true } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.paymentType.findMany({ orderBy: { name: "asc" } }),
    prisma.purchaseType.findMany({ orderBy: { name: "asc" } }),
  ]);

  const allowedStatuses: ExpenseStatus[] =
    session.user.role === "ADMIN"
      ? ["A_VENIR", "EN_ATTENTE", "VALIDE", "REALISE", "REJETE", "ANNULE"]
      : CREATE_STATUSES;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouvelle dépense</h1>
      <ExpenseForm
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        budgetLines={budgetLines.map((l) => ({
          id: l.id,
          projectId: l.projectId,
          rubrique: l.rubrique,
          productTitle: l.productTitle,
          budgetedAmountHTCents: l.budgetedAmountHTCents,
        }))}
        suppliers={suppliers}
        paymentTypes={paymentTypes}
        purchaseTypes={purchaseTypes}
        allowedStatuses={allowedStatuses}
      />
    </div>
  );
}
