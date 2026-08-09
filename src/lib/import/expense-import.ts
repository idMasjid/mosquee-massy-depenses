import "server-only";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { parseFrenchNumberToCents } from "@/lib/money";

export type ParsedCell = string | number | Date | null;
export type ParsedRow = Record<string, ParsedCell>;

// Column headers match the association's historical spreadsheet export
// (see prisma/seed.ts DetailRow) so existing tracking sheets can be reused as-is.
export const REQUIRED_IMPORT_HEADERS = ["Date saisie", "Projet", "Catégorie", "Titre produit", "Fournisseur", "Montant TTC"] as const;

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMPORT_EXTENSIONS = [".csv", ".xlsx"];

function normalizeHeader(header: string): string {
  return header.replace(/\s+/g, " ").trim();
}

// Google Sheets / Excel exports can include a few blank title rows above the
// real header — strip them so csv-parse sees the correct header row.
function stripLeadingBlankLines(content: string): string {
  const lines = content.split(/\r?\n/);
  let start = 0;
  while (start < lines.length && /^[,\s]*$/.test(lines[start])) start++;
  return lines.slice(start).join("\n");
}

function nonEmptyStr(value: ParsedCell): string | null {
  if (value == null || value instanceof Date) return null;
  const str = String(value).trim();
  return str ? str : null;
}

function cellToDate(value: ParsedCell): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const frMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (frMatch) {
    const [, d, m, y] = frMatch;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function cellToCents(value: ParsedCell): number | null {
  if (value == null || value instanceof Date) return null;
  if (typeof value === "number") return Math.round(value * 100);
  return parseFrenchNumberToCents(value);
}

function cellToNumber(value: ParsedCell): number | null {
  if (value == null || value instanceof Date) return null;
  if (typeof value === "number") return value;
  const cleaned = value.replace(/[€%\s ]/g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

// Excel on Windows exports "CSV" using the system codepage (Windows-1252 for
// French locales), not UTF-8, unless "CSV UTF-8" is picked explicitly. Detect
// which one we got instead of assuming — this also strips a UTF-8 BOM if present.
function decodeCsvBuffer(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function parseCsvRows(buffer: Buffer): ParsedRow[] {
  const content = stripLeadingBlankLines(decodeCsvBuffer(buffer));
  return parse(content, {
    columns: (header: string[]) => header.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
  }) as ParsedRow[];
}

function excelCellToValue(raw: ExcelJS.CellValue): ParsedCell {
  if (raw == null) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === "number" || typeof raw === "string") return raw;
  if (typeof raw === "boolean") return String(raw);
  if (typeof raw === "object") {
    if ("richText" in raw) return raw.richText.map((t) => t.text).join("");
    if ("result" in raw) return excelCellToValue((raw as { result: ExcelJS.CellValue }).result);
    if ("text" in raw) return String((raw as { text: unknown }).text);
  }
  return null;
}

export async function parseXlsxRows(buffer: Buffer): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types resolve this parameter against a nested, older
  // @types/node (pulled in via its fast-csv dependency) that structurally
  // differs from this project's Buffer type — same value at runtime.
  await workbook.xlsx.load(buffer as never);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = normalizeHeader(String(cell.value ?? ""));
  });

  const rows: ParsedRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: ParsedRow = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = excelCellToValue(cell.value);
      if (value != null) hasValue = true;
      record[header] = value;
    });
    if (hasValue) rows.push(record);
  });
  return rows;
}

// Accent/case-insensitive comparison, used to match an imported row's product
// title against a budget line's (shorter, categorical) title.
function normalizeTitle(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// Matches an imported row to a budget line, in decreasing order of confidence.
// Returns null (leave unlinked for manual review) rather than guessing when
// several budget lines could plausibly match. Ported from prisma/seed.ts.
export async function findBudgetLineForImport(projectId: string, rubrique: string, productTitle: string | null) {
  const exact = await prisma.budgetLine.findUnique({
    where: { projectId_rubrique_productTitle: { projectId, rubrique, productTitle: productTitle ?? "" } },
  });
  if (exact) return exact;
  if (!productTitle) return null;

  const candidates = await prisma.budgetLine.findMany({ where: { projectId } });
  if (candidates.length === 0) return null;

  const normalizedExpenseTitle = normalizeTitle(productTitle);
  const sameRubrique = candidates.filter((c) => c.rubrique === rubrique);
  const searchOrder = [sameRubrique, candidates];

  for (const pool of searchOrder) {
    const titleMatch = pool.find((c) => c.productTitle && normalizeTitle(c.productTitle) === normalizedExpenseTitle);
    if (titleMatch) return titleMatch;
  }
  for (const pool of searchOrder) {
    const substringMatches = pool.filter(
      (c) => c.productTitle && normalizedExpenseTitle.includes(normalizeTitle(c.productTitle)),
    );
    if (substringMatches.length === 1) return substringMatches[0];
  }
  return null;
}

export type ExpenseImportData = {
  entryDate: Date;
  orderDate: Date | null;
  supplierName: string;
  supplierIdentifier: string | null;
  orderNumber: string | null;
  purchaseType: string | null;
  invoiceDate: Date | null;
  invoiceNumber: string | null;
  invoiceLink: string | null;
  unitPriceHTCents: number | null;
  quantity: number;
  deliveryFeeCents: number;
  importFeeCents: number;
  discountCents: number;
  totalHTCents: number;
  vatRateBps: number | null;
  vatAmountCents: number | null;
  totalTTCCents: number;
  paymentType: string | null;
  paymentReference: string | null;
  productTitle: string;
  segment: string | null;
  rubriqueLabel: string;
  projectId: string;
  budgetLineId: string | null;
};

export type MapRowResult = { ok: true; data: ExpenseImportData } | { ok: false; error: string };

export async function mapRowToExpenseInput(
  row: ParsedRow,
  rowNumber: number,
  projectIdByNormalizedName: Map<string, string>,
  allowedRubriqueByProjectAndName: Map<string, string>,
  supplierByNormalizedName: Map<string, string>,
  paymentTypeByNormalizedName: Map<string, string>,
  purchaseTypeByNormalizedName: Map<string, string>,
): Promise<MapRowResult> {
  const fail = (message: string): MapRowResult => ({ ok: false, error: `Ligne ${rowNumber} : ${message}` });

  const entryDate = cellToDate(row["Date saisie"]);
  const projectName = nonEmptyStr(row["Projet"]);
  const rubriqueRaw = nonEmptyStr(row["Catégorie"]);
  const productTitle = nonEmptyStr(row["Titre produit"]);
  const supplierNameRaw = nonEmptyStr(row["Fournisseur"]);
  const totalTTCCents = cellToCents(row["Montant TTC"]);

  if (!entryDate) return fail("date de saisie manquante ou invalide (attendu JJ/MM/AAAA).");
  if (!projectName) return fail("colonne « Projet » manquante.");
  if (!rubriqueRaw) return fail("colonne « Catégorie » manquante.");
  if (!productTitle) return fail("colonne « Titre produit » manquante.");
  if (!supplierNameRaw) return fail("colonne « Fournisseur » manquante.");
  if (totalTTCCents == null) return fail("montant TTC manquant ou invalide.");

  const projectId = projectIdByNormalizedName.get(projectName.trim().toLowerCase());
  if (!projectId) return fail(`projet « ${projectName} » introuvable.`);

  const rubrique = allowedRubriqueByProjectAndName.get(`${projectId}::${rubriqueRaw.trim().toLowerCase()}`);
  if (!rubrique) return fail(`catégorie « ${rubriqueRaw} » introuvable pour le projet « ${projectName} ».`);

  const supplierName = supplierByNormalizedName.get(supplierNameRaw.trim().toLowerCase());
  if (!supplierName) return fail(`fournisseur « ${supplierNameRaw} » introuvable.`);

  const paymentTypeRaw = nonEmptyStr(row["Type paiement"]);
  let paymentType: string | null = null;
  if (paymentTypeRaw) {
    paymentType = paymentTypeByNormalizedName.get(paymentTypeRaw.trim().toLowerCase()) ?? null;
    if (!paymentType) return fail(`type de paiement « ${paymentTypeRaw} » introuvable.`);
  }

  const purchaseTypeRaw = nonEmptyStr(row["Type (Internet, physique…)"]);
  let purchaseType: string | null = null;
  if (purchaseTypeRaw) {
    purchaseType = purchaseTypeByNormalizedName.get(purchaseTypeRaw.trim().toLowerCase()) ?? null;
    if (!purchaseType) return fail(`type d'achat « ${purchaseTypeRaw} » introuvable.`);
  }

  const budgetLine = await findBudgetLineForImport(projectId, rubrique, productTitle);

  const unitPriceHTCents = cellToCents(row["Montant unitaire HT"]);
  const quantityRaw = cellToNumber(row["Quantité"]);
  const quantity = quantityRaw && quantityRaw > 0 ? quantityRaw : 1;
  const deliveryFeeCents = cellToCents(row["Livraison"]) ?? 0;
  const importFeeCents = cellToCents(row["Frais import"]) ?? 0;
  const discountCents = Math.abs(cellToCents(row["Réduction"]) ?? 0);
  const parsedTotalHT = cellToCents(row["Total HT"]);
  const totalHTCents =
    parsedTotalHT ??
    (unitPriceHTCents != null
      ? Math.round(unitPriceHTCents * quantity) + deliveryFeeCents + importFeeCents - discountCents
      : totalTTCCents);
  const vatAmountCents = cellToCents(row["TVA"]);
  const vatRateRaw = cellToNumber(row["Taux TVA"]);
  const vatRateBps = vatRateRaw != null ? Math.round(vatRateRaw * 100) : null;

  return {
    ok: true,
    data: {
      entryDate,
      orderDate: cellToDate(row["Date commande"]),
      supplierName,
      supplierIdentifier: nonEmptyStr(row["Identifiant fournisseur (mail, ref…)"]),
      orderNumber: nonEmptyStr(row["N° bon de commande/devis"]),
      purchaseType,
      invoiceDate: cellToDate(row["Date facture"]),
      invoiceNumber: nonEmptyStr(row["N° facture"]),
      invoiceLink: nonEmptyStr(row["Lien facture"]),
      unitPriceHTCents,
      quantity,
      deliveryFeeCents,
      importFeeCents,
      discountCents,
      totalHTCents,
      vatRateBps,
      vatAmountCents,
      totalTTCCents,
      paymentType,
      paymentReference: nonEmptyStr(row["Ref. paiement (n° chèque, ref. virement)"]),
      productTitle,
      segment: nonEmptyStr(row["Segment"]),
      rubriqueLabel: rubrique,
      projectId,
      budgetLineId: budgetLine?.id ?? null,
    },
  };
}
