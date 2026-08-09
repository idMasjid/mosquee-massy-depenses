import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { LookupTableManager } from "@/components/admin/lookup-table-manager";
import { createSupplier, updateSupplier, deleteSupplier } from "@/lib/actions/supplier-actions";

export default async function AdminSuppliersPage() {
  await requireRole(["ADMIN", "IT"]);

  const [suppliers, usage] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.expense.groupBy({ by: ["supplierName"], _count: true }),
  ]);
  const usageByName = new Map(usage.map((u) => [u.supplierName, u._count]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fournisseurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Liste fermée proposée lors de la saisie d&apos;une dépense et de l&apos;import.
        </p>
      </div>
      <LookupTableManager
        entityLabel="fournisseur"
        entityLabelCapitalized="Fournisseur"
        items={suppliers.map((s) => ({ id: s.id, name: s.name, usageCount: usageByName.get(s.name) ?? 0 }))}
        createAction={createSupplier}
        updateAction={updateSupplier}
        deleteAction={deleteSupplier}
      />
    </div>
  );
}
