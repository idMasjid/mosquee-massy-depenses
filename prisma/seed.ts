import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import {
  parseFrenchDate,
  parseFrenchNumberToCents,
  slugifyName,
  nonEmpty,
  normalizeHeader,
  stripLeadingBlankLines,
  forwardFill,
} from "./seed-lib";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const SEED_DATA_DIR = path.join(__dirname, "seed-data");
const LEGACY_DOMAIN = "import.mosquee-massy.local";

const ADMIN_EMAIL = "ai@mosquee-massy.fr";
const ADMIN_INITIAL_PASSWORD = "ChangeMoi123!";

async function upsertPlaceholderUser(name: string) {
  const email = `${slugifyName(name)}@${LEGACY_DOMAIN}`;
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: "IT",
      isActive: false,
      isPlaceholder: true,
    },
  });
}

async function seedCoreUsers() {
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Administrateur",
      role: "ADMIN",
      isActive: true,
      passwordHash: hashPassword(ADMIN_INITIAL_PASSWORD),
    },
  });

  const tama = await upsertPlaceholderUser("Tama SAMAKE");
  console.log(`Admin (${ADMIN_EMAIL}) et utilisateur historique (${tama.email}) prêts.`);
  console.log(`Mot de passe initial admin: ${ADMIN_INITIAL_PASSWORD} (à changer après la première connexion)`);
}

type ProjetsRow = {
  Projet?: string;
  Rubrique?: string;
  "Titre produit"?: string;
  "Montant total budget"?: string;
};

async function seedProjectsAndBudgets() {
  const filePath = path.join(SEED_DATA_DIR, "projets.csv");
  if (!existsSync(filePath)) {
    console.log("prisma/seed-data/projets.csv introuvable, étape ignorée.");
    return;
  }

  const rawRows = parse(readFileSync(filePath), {
    columns: (header: string[]) => header.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
  }) as ProjetsRow[];

  // Merged Projet/Rubrique cells only carry a value on the group's first row;
  // "Total pour ..." rollup rows are skipped below via the Titre produit check.
  const rows = forwardFill(rawRows, ["Projet", "Rubrique"]);

  let projectCount = 0;
  let budgetLineCount = 0;
  const seenProjects = new Set<string>();

  for (const row of rows) {
    const projectName = nonEmpty(row["Projet"]);
    const rubrique = nonEmpty(row["Rubrique"]);
    const productTitle = nonEmpty(row["Titre produit"]);
    // Rows without a product title are subtotal/total rollups, not budget lines.
    if (!projectName || !rubrique || !productTitle) continue;

    const project = await prisma.project.upsert({
      where: { name: projectName },
      update: {},
      create: { name: projectName },
    });
    if (!seenProjects.has(project.id)) {
      seenProjects.add(project.id);
      projectCount++;
    }

    const budgetedAmountHTCents = parseFrenchNumberToCents(row["Montant total budget"]) ?? 0;

    await prisma.budgetLine.upsert({
      where: {
        projectId_rubrique_productTitle: {
          projectId: project.id,
          rubrique,
          productTitle: productTitle ?? "",
        },
      },
      update: { budgetedAmountHTCents },
      create: {
        projectId: project.id,
        rubrique,
        productTitle,
        budgetedAmountHTCents,
      },
    });
    budgetLineCount++;
  }

  console.log(`Projets/budgets importés: ${projectCount} lignes projet, ${budgetLineCount} lignes budget.`);
}

type DetailRow = {
  "Date saisie"?: string;
  "Identité du membre effectuant la saisie"?: string;
  "Date commande"?: string;
  Fournisseur?: string;
  "Identifiant fournisseur (mail, ref…)"?: string;
  "N° bon de commande/devis"?: string;
  "Type (Internet, physique…)"?: string;
  "Date facture"?: string;
  "N° facture"?: string;
  "Lien facture"?: string;
  "Montant unitaire HT"?: string;
  Quantité?: string;
  Livraison?: string;
  "Frais import"?: string;
  Réduction?: string;
  "Total HT"?: string;
  "Taux TVA"?: string;
  TVA?: string;
  "Montant TTC"?: string;
  "Type paiement"?: string;
  "Ref. paiement (n° chèque, ref. virement)"?: string;
  "Titre produit"?: string;
  Segment?: string;
  Projet?: string;
  Rubrique?: string;
  "Service affecté Amazon"?: string;
  "Filtre budget"?: string;
  Colonne3?: string;
};

async function seedExpenses() {
  const existing = await prisma.expense.count();
  if (existing > 0) {
    console.log(`${existing} dépenses déjà présentes, import historique ignoré.`);
    return;
  }

  const filePath = path.join(SEED_DATA_DIR, "detail-depenses.csv");
  if (!existsSync(filePath)) {
    console.log("prisma/seed-data/detail-depenses.csv introuvable, étape ignorée.");
    return;
  }

  const content = stripLeadingBlankLines(readFileSync(filePath, "utf-8"));
  const rawRows = parse(content, {
    columns: (header: string[]) => header.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
  }) as DetailRow[];
  const rows = forwardFill(rawRows, ["Projet", "Rubrique"]);

  const userCache = new Map<string, string>();
  const projectCache = new Map<string, string>();

  let created = 0;

  let plannedCreated = 0;

  for (const row of rows) {
    const projectName = nonEmpty(row["Projet"]);
    const rubrique = nonEmpty(row["Rubrique"]);
    const productTitle = nonEmpty(row["Titre produit"]);
    const supplierName = nonEmpty(row["Fournisseur"]);
    const entryDate = parseFrenchDate(row["Date saisie"]);

    // Some rows have no supplier/product chosen yet — just a rough label
    // ("Filtre budget") and an estimated amount. These are planned/future
    // expenses, not completed purchases: import them as "À venir" so they
    // still feed the forecast dashboard.
    const isFullHistoricalRow = productTitle && supplierName;
    const roughLabel = nonEmpty(row["Filtre budget"]);
    const roughAmountCents = parseFrenchNumberToCents(row["Montant TTC"]) ?? parseFrenchNumberToCents(row["Total HT"]);
    const isPlannedRow = !isFullHistoricalRow && roughLabel && roughAmountCents != null;

    if (!projectName || !rubrique || !entryDate || (!isFullHistoricalRow && !isPlannedRow)) {
      console.warn("Ligne ignorée (champs requis manquants):", row);
      continue;
    }

    let projectId = projectCache.get(projectName);
    if (!projectId) {
      const project = await prisma.project.upsert({
        where: { name: projectName },
        update: {},
        create: { name: projectName },
      });
      projectId = project.id;
      projectCache.set(projectName, projectId);
    }

    let budgetLine = await prisma.budgetLine.findUnique({
      where: {
        projectId_rubrique_productTitle: {
          projectId,
          rubrique,
          productTitle: productTitle ?? "",
        },
      },
    });
    if (!budgetLine) {
      budgetLine = await prisma.budgetLine.findFirst({
        where: { projectId, rubrique },
      });
    }

    const initiatorName = nonEmpty(row["Identité du membre effectuant la saisie"]) ?? "Inconnu";
    let initiatorId = userCache.get(initiatorName);
    if (!initiatorId) {
      const user = await upsertPlaceholderUser(initiatorName);
      initiatorId = user.id;
      userCache.set(initiatorName, initiatorId);
    }

    if (isPlannedRow) {
      const expense = await prisma.expense.create({
        data: {
          status: "A_VENIR",
          createdById: initiatorId,
          legacyInitiatorName: initiatorName,
          entryDate,
          supplierName: "À déterminer",
          totalHTCents: roughAmountCents,
          totalTTCCents: roughAmountCents,
          productTitle: roughLabel,
          rubriqueLabel: rubrique,
          projectId,
          budgetLineId: budgetLine?.id,
        },
      });
      await prisma.expenseStatusEvent.create({
        data: {
          expenseId: expense.id,
          fromStatus: null,
          toStatus: "A_VENIR",
          note: "Import historique (dépense planifiée, détails à compléter)",
          byUserId: initiatorId,
        },
      });
      plannedCreated++;
      continue;
    }
    if (!productTitle || !supplierName) continue;

    const unitPriceHTCents = parseFrenchNumberToCents(row["Montant unitaire HT"]);
    const quantity = row["Quantité"] ? Number.parseFloat(row["Quantité"].replace(",", ".")) : 1;
    const deliveryFeeCents = parseFrenchNumberToCents(row["Livraison"]) ?? 0;
    const importFeeCents = parseFrenchNumberToCents(row["Frais import"]) ?? 0;
    // Source stores reductions as a signed negative delta; we keep discountCents
    // as a positive magnitude and subtract it explicitly (see totalHTCents below).
    const discountCents = Math.abs(parseFrenchNumberToCents(row["Réduction"]) ?? 0);
    const parsedTotalHT = parseFrenchNumberToCents(row["Total HT"]);
    const totalHTCents =
      parsedTotalHT ??
      Math.round((unitPriceHTCents ?? 0) * (quantity || 1)) + deliveryFeeCents + importFeeCents - discountCents;
    const vatAmountCents = parseFrenchNumberToCents(row["TVA"]);
    const parsedTotalTTC = parseFrenchNumberToCents(row["Montant TTC"]);
    const totalTTCCents = parsedTotalTTC ?? totalHTCents + (vatAmountCents ?? 0);
    const vatRateRaw = nonEmpty(row["Taux TVA"]);
    const vatRateBps = vatRateRaw
      ? Math.round(Number.parseFloat(vatRateRaw.replace("%", "").replace(",", ".")) * 100)
      : null;

    const expense = await prisma.expense.create({
      data: {
        status: "REALISE",
        createdById: initiatorId,
        legacyInitiatorName: initiatorName,
        entryDate,
        orderDate: parseFrenchDate(row["Date commande"]),
        supplierName,
        supplierIdentifier: nonEmpty(row["Identifiant fournisseur (mail, ref…)"]),
        orderNumber: nonEmpty(row["N° bon de commande/devis"]),
        purchaseType: nonEmpty(row["Type (Internet, physique…)"]),
        invoiceDate: parseFrenchDate(row["Date facture"]),
        invoiceNumber: nonEmpty(row["N° facture"]),
        invoiceLink: nonEmpty(row["Lien facture"]),
        unitPriceHTCents,
        quantity: quantity || 1,
        deliveryFeeCents,
        importFeeCents,
        discountCents,
        totalHTCents,
        vatRateBps,
        vatAmountCents,
        totalTTCCents,
        paymentType: nonEmpty(row["Type paiement"]),
        paymentReference: nonEmpty(row["Ref. paiement (n° chèque, ref. virement)"]),
        productTitle,
        segment: nonEmpty(row["Segment"]),
        rubriqueLabel: rubrique,
        amazonService: nonEmpty(row["Service affecté Amazon"]),
        legacyBudgetFilter: nonEmpty(row["Filtre budget"]),
        legacyColumn3: nonEmpty(row["Colonne3"]),
        projectId,
        budgetLineId: budgetLine?.id,
        realizedAt: entryDate,
      },
    });

    await prisma.expenseStatusEvent.create({
      data: {
        expenseId: expense.id,
        fromStatus: null,
        toStatus: "REALISE",
        note: "Import historique",
        byUserId: initiatorId,
      },
    });

    created++;
  }

  console.log(`${created} dépenses historiques importées (${plannedCreated} dépenses planifiées "À venir").`);
}

async function main() {
  await seedCoreUsers();
  await seedProjectsAndBudgets();
  await seedExpenses();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
