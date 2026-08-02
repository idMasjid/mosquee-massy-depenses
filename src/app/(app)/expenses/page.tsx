import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ExpensesExplorer, type ExpenseRow } from "@/components/expenses/expenses-explorer";
import type { ExpenseStatus } from "@/lib/constants";

export default async function ExpensesPage() {
  const session = await requireSession();

  const [expenses, projects] = await Promise.all([
    prisma.expense.findMany({
      include: { project: true },
      orderBy: { entryDate: "desc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    entryDate: e.entryDate.toISOString(),
    productTitle: e.productTitle,
    supplierName: e.supplierName,
    projectName: e.project.name,
    rubriqueLabel: e.rubriqueLabel,
    totalTTCCents: e.totalTTCCents,
    status: e.status as ExpenseStatus,
  }));

  const canCreate = session.user.role === "ADMIN" || session.user.role === "IT";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dépenses</h1>
        {canCreate && (
          <Button size="sm" nativeButton={false} render={<Link href="/expenses/new" />}>
            <Plus className="size-4" />
            Nouvelle dépense
          </Button>
        )}
      </div>
      <ExpensesExplorer expenses={rows} projectNames={projects.map((p) => p.name)} />
    </div>
  );
}
