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

  worksheet.columns = [
    { header: "Date de saisie", key: "entryDate", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "Statut", key: "status", width: 18 },
    { header: "Projet", key: "project", width: 22 },
    { header: "Catégorie", key: "rubrique", width: 20 },
    { header: "Titre produit", key: "productTitle", width: 30 },
    { header: "Fournisseur", key: "supplierName", width: 22 },
    { header: "Date commande", key: "orderDate", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "N° bon de commande", key: "orderNumber", width: 18 },
    { header: "Date facture", key: "invoiceDate", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "N° facture", key: "invoiceNumber", width: 16 },
    { header: "Montant HT", key: "totalHT", width: 14, style: { numFmt: MONEY_FORMAT } },
    { header: "TVA", key: "vat", width: 12, style: { numFmt: MONEY_FORMAT } },
    { header: "Montant TTC", key: "totalTTC", width: 14, style: { numFmt: MONEY_FORMAT } },
    { header: "Type de paiement", key: "paymentType", width: 18 },
    { header: "Référence paiement", key: "paymentReference", width: 20 },
    { header: "Type d'achat", key: "purchaseType", width: 16 },
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
      orderDate: e.orderDate ?? undefined,
      orderNumber: e.orderNumber ?? undefined,
      invoiceDate: e.invoiceDate ?? undefined,
      invoiceNumber: e.invoiceNumber ?? undefined,
      totalHT: fromCents(e.totalHTCents),
      vat: e.vatAmountCents != null ? fromCents(e.vatAmountCents) : undefined,
      totalTTC: fromCents(e.totalTTCCents),
      paymentType: e.paymentType ?? undefined,
      paymentReference: e.paymentReference ?? undefined,
      purchaseType: e.purchaseType ?? undefined,
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
