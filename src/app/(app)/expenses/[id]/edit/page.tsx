import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { fromCents } from "@/lib/money";
import { ExpenseForm } from "@/components/expenses/expense-form";
import type { ExpenseStatus } from "@/lib/constants";

function dateInputValue(date: Date | null): string | undefined {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(["ADMIN", "IT"]);

  const [expense, projects, budgetLines, suppliers, paymentTypes, purchaseTypes] = await Promise.all([
    prisma.expense.findUnique({ where: { id } }),
    // Not filtered to isActive: an expense may belong to a project/line that's since
    // been archived, and it must still show up as the current selection when editing.
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.budgetLine.findMany(),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.paymentType.findMany({ orderBy: { name: "asc" } }),
    prisma.purchaseType.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!expense) notFound();

  const canEdit =
    session.user.role === "ADMIN" || ["A_VENIR", "EN_ATTENTE", "REJETE"].includes(expense.status);
  if (!canEdit) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Modifier la dépense</h1>
      <ExpenseForm
        expenseId={expense.id}
        allowedStatuses={[expense.status as ExpenseStatus]}
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
        defaultValues={{
          status: expense.status as ExpenseStatus,
          entryDate: dateInputValue(expense.entryDate) ?? "",
          orderDate: dateInputValue(expense.orderDate),
          invoiceDate: dateInputValue(expense.invoiceDate),
          supplierName: expense.supplierName,
          supplierIdentifier: expense.supplierIdentifier ?? undefined,
          orderNumber: expense.orderNumber ?? undefined,
          purchaseType: expense.purchaseType ?? undefined,
          invoiceNumber: expense.invoiceNumber ?? undefined,
          invoiceLink: expense.invoiceLink ?? undefined,
          unitPriceHT: expense.unitPriceHTCents != null ? fromCents(expense.unitPriceHTCents) : undefined,
          quantity: expense.quantity ?? 1,
          deliveryFee: fromCents(expense.deliveryFeeCents ?? 0),
          importFee: fromCents(expense.importFeeCents ?? 0),
          discount: fromCents(expense.discountCents ?? 0),
          totalHT: fromCents(expense.totalHTCents),
          vatRate: expense.vatRateBps != null ? expense.vatRateBps / 100 : undefined,
          vatAmount: expense.vatAmountCents != null ? fromCents(expense.vatAmountCents) : undefined,
          totalTTC: fromCents(expense.totalTTCCents),
          paymentType: expense.paymentType ?? undefined,
          paymentReference: expense.paymentReference ?? undefined,
          productTitle: expense.productTitle,
          projectId: expense.projectId,
          budgetLineId: expense.budgetLineId ?? undefined,
          rubriqueLabel: expense.rubriqueLabel,
        }}
      />
    </div>
  );
}
