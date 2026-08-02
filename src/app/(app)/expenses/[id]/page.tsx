import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { formatEUR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/expenses/status-badge";
import { StatusActions } from "@/components/expenses/status-actions";
import { StatusTimeline } from "@/components/expenses/status-timeline";
import { AttachmentUploader } from "@/components/expenses/attachment-uploader";
import type { ExpenseStatus } from "@/lib/constants";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      project: true,
      budgetLine: true,
      createdBy: true,
      validatedBy: true,
      rejectedBy: true,
      cancelledBy: true,
      attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      statusEvents: { include: { byUser: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!expense) notFound();

  const canEdit =
    session.user.role === "ADMIN" ||
    (session.user.role === "IT" && ["A_VENIR", "EN_ATTENTE", "REJETE"].includes(expense.status));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{expense.productTitle}</h1>
            <StatusBadge status={expense.status as ExpenseStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {expense.project.name} · {expense.rubriqueLabel}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/expenses/${expense.id}/edit`} />}>
            <Pencil className="size-4" />
            Modifier
          </Button>
        )}
      </div>

      <StatusActions expenseId={expense.id} status={expense.status as ExpenseStatus} role={session.user.role} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Montants</h2>
          <InfoRow label="Montant unitaire HT" value={expense.unitPriceHTCents != null ? formatEUR(expense.unitPriceHTCents) : null} />
          <InfoRow label="Quantité" value={expense.quantity != null ? String(expense.quantity) : null} />
          <InfoRow label="Livraison" value={expense.deliveryFeeCents ? formatEUR(expense.deliveryFeeCents) : null} />
          <InfoRow label="Frais import" value={expense.importFeeCents ? formatEUR(expense.importFeeCents) : null} />
          <InfoRow label="Réduction" value={expense.discountCents ? formatEUR(-expense.discountCents) : null} />
          <InfoRow label="Total HT" value={formatEUR(expense.totalHTCents)} />
          <InfoRow label="TVA" value={expense.vatAmountCents != null ? formatEUR(expense.vatAmountCents) : null} />
          <InfoRow label="Total TTC" value={formatEUR(expense.totalTTCCents)} />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Détails</h2>
          <InfoRow label="Fournisseur" value={expense.supplierName} />
          <InfoRow label="Identifiant fournisseur" value={expense.supplierIdentifier} />
          <InfoRow label="Type d'achat" value={expense.purchaseType} />
          <InfoRow label="Date de saisie" value={dateFmt.format(expense.entryDate)} />
          <InfoRow label="Date de commande" value={expense.orderDate ? dateFmt.format(expense.orderDate) : null} />
          <InfoRow label="Date de facture" value={expense.invoiceDate ? dateFmt.format(expense.invoiceDate) : null} />
          <InfoRow label="N° facture" value={expense.invoiceNumber} />
          <InfoRow label="N° bon de commande" value={expense.orderNumber} />
          <InfoRow label="Type de paiement" value={expense.paymentType} />
          <InfoRow label="Référence paiement" value={expense.paymentReference} />
          <InfoRow label="Initiateur" value={expense.legacyInitiatorName ?? expense.createdBy.name} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Pièces jointes</h2>
        <AttachmentUploader
          expenseId={expense.id}
          attachments={expense.attachments}
          canDelete={session.user.role === "ADMIN" || session.user.role === "IT"}
        />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Historique</h2>
        <StatusTimeline events={expense.statusEvents} />
      </div>
    </div>
  );
}
