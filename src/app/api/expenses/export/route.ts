import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/rbac";
import { fromCents } from "@/lib/money";
import { STATUS_LABELS, type ExpenseStatus } from "@/lib/constants";

const MONEY_FORMAT = '#,##0.00 "€"';
const DATE_FORMAT = "dd/mm/yyyy";

export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const project = searchParams.get("project");
  const search = searchParams.get("search")?.trim().toLowerCase();

  const expenses = await prisma.expense.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(project ? { project: { name: project } } : {}),
    },
    include: { project: true },
    orderBy: { entryDate: "desc" },
  });

  const filtered = search
    ? expenses.filter((e) => `${e.productTitle} ${e.supplierName}`.toLowerCase().includes(search))
    : expenses;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Dépenses");

  // Headers match REQUIRED_IMPORT_HEADERS / mapRowToExpenseInput's column
  // names exactly (src/lib/import/expense-import.ts) so an exported file can
  // be re-imported as-is — "Statut" is the only extra column, harmlessly
  // ignored by the importer since it doesn't map to any writable field.
  worksheet.columns = [
    { header: "Date saisie", key: "entryDate", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "Statut", key: "status", width: 18 },
    { header: "Projet", key: "project", width: 22 },
    { header: "Catégorie", key: "rubrique", width: 20 },
    { header: "Titre produit", key: "productTitle", width: 30 },
    { header: "Fournisseur", key: "supplierName", width: 22 },
    { header: "Identifiant fournisseur (mail, ref…)", key: "supplierIdentifier", width: 24 },
    { header: "Date commande", key: "orderDate", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "N° bon de commande/devis", key: "orderNumber", width: 18 },
    { header: "Type (Internet, physique…)", key: "purchaseType", width: 16 },
    { header: "Date facture", key: "invoiceDate", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "N° facture", key: "invoiceNumber", width: 16 },
    { header: "Lien facture", key: "invoiceLink", width: 20 },
    { header: "Montant unitaire HT", key: "unitPriceHT", width: 16, style: { numFmt: MONEY_FORMAT } },
    { header: "Quantité", key: "quantity", width: 10 },
    { header: "Livraison", key: "deliveryFee", width: 12, style: { numFmt: MONEY_FORMAT } },
    { header: "Frais import", key: "importFee", width: 12, style: { numFmt: MONEY_FORMAT } },
    { header: "Réduction", key: "discount", width: 12, style: { numFmt: MONEY_FORMAT } },
    { header: "Total HT", key: "totalHT", width: 14, style: { numFmt: MONEY_FORMAT } },
    { header: "Taux TVA", key: "vatRate", width: 10 },
    { header: "TVA", key: "vat", width: 12, style: { numFmt: MONEY_FORMAT } },
    { header: "Montant TTC", key: "totalTTC", width: 14, style: { numFmt: MONEY_FORMAT } },
    { header: "Type paiement", key: "paymentType", width: 18 },
    { header: "Ref. paiement (n° chèque, ref. virement)", key: "paymentReference", width: 24 },
    { header: "Segment", key: "segment", width: 16 },
  ];

  for (const e of filtered) {
    worksheet.addRow({
      entryDate: e.entryDate,
      status: STATUS_LABELS[e.status as ExpenseStatus] ?? e.status,
      project: e.project.name,
      rubrique: e.rubriqueLabel,
      productTitle: e.productTitle,
      supplierName: e.supplierName,
      supplierIdentifier: e.supplierIdentifier ?? undefined,
      orderDate: e.orderDate ?? undefined,
      orderNumber: e.orderNumber ?? undefined,
      purchaseType: e.purchaseType ?? undefined,
      invoiceDate: e.invoiceDate ?? undefined,
      invoiceNumber: e.invoiceNumber ?? undefined,
      invoiceLink: e.invoiceLink ?? undefined,
      unitPriceHT: e.unitPriceHTCents != null ? fromCents(e.unitPriceHTCents) : undefined,
      quantity: e.quantity,
      deliveryFee: e.deliveryFeeCents != null ? fromCents(e.deliveryFeeCents) : undefined,
      importFee: e.importFeeCents != null ? fromCents(e.importFeeCents) : undefined,
      discount: e.discountCents != null ? fromCents(e.discountCents) : undefined,
      totalHT: fromCents(e.totalHTCents),
      vatRate: e.vatRateBps != null ? e.vatRateBps / 100 : undefined,
      vat: e.vatAmountCents != null ? fromCents(e.vatAmountCents) : undefined,
      totalTTC: fromCents(e.totalTTCCents),
      paymentType: e.paymentType ?? undefined,
      paymentReference: e.paymentReference ?? undefined,
      segment: e.segment ?? undefined,
    });
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: worksheet.columns.length } };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `depenses-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
