import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { LookupTableManager } from "@/components/admin/lookup-table-manager";
import { createPaymentType, updatePaymentType, deletePaymentType } from "@/lib/actions/payment-type-actions";

export default async function AdminPaymentTypesPage() {
  await requireRole(["ADMIN", "IT"]);

  const [paymentTypes, usage] = await Promise.all([
    prisma.paymentType.findMany({ orderBy: { name: "asc" } }),
    prisma.expense.groupBy({ by: ["paymentType"], _count: true }),
  ]);
  const usageByName = new Map(usage.map((u) => [u.paymentType, u._count]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Types de paiement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Liste fermée proposée lors de la saisie d&apos;une dépense et de l&apos;import.
        </p>
      </div>
      <LookupTableManager
        entityLabel="type de paiement"
        entityLabelCapitalized="Type de paiement"
        items={paymentTypes.map((p) => ({ id: p.id, name: p.name, usageCount: usageByName.get(p.name) ?? 0 }))}
        createAction={createPaymentType}
        updateAction={updatePaymentType}
        deleteAction={deletePaymentType}
      />
    </div>
  );
}
