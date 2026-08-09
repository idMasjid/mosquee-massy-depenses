import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { LookupTableManager } from "@/components/admin/lookup-table-manager";
import { createPurchaseType, updatePurchaseType, deletePurchaseType } from "@/lib/actions/purchase-type-actions";

export default async function AdminPurchaseTypesPage() {
  await requireRole(["ADMIN", "IT"]);

  const [purchaseTypes, usage] = await Promise.all([
    prisma.purchaseType.findMany({ orderBy: { name: "asc" } }),
    prisma.expense.groupBy({ by: ["purchaseType"], _count: true }),
  ]);
  const usageByName = new Map(usage.map((u) => [u.purchaseType, u._count]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Types d&apos;achat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Liste fermée proposée lors de la saisie d&apos;une dépense et de l&apos;import.
        </p>
      </div>
      <LookupTableManager
        entityLabel="type d'achat"
        entityLabelCapitalized="Type d'achat"
        items={purchaseTypes.map((p) => ({ id: p.id, name: p.name, usageCount: usageByName.get(p.name) ?? 0 }))}
        createAction={createPurchaseType}
        updateAction={updatePurchaseType}
        deleteAction={deletePurchaseType}
      />
    </div>
  );
}
