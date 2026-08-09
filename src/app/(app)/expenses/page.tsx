import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ExpensesExplorer, type ExpenseRow } from "@/components/expenses/expenses-explorer";
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/lib/constants";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const { status } = await searchParams;
  const initialStatus = EXPENSE_STATUSES.find((s) => s === status);

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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/expenses/import" />}>
              <Upload className="size-4" />
              Importer
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/expenses/new" />}>
              <Plus className="size-4" />
              Nouvelle dépense
            </Button>
          </div>
        )}
      </div>
      <ExpensesExplorer expenses={rows} projectNames={projects.map((p) => p.name)} initialStatus={initialStatus} />
    </div>
  );
}
