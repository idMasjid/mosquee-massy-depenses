-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BudgetLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "rubrique" TEXT NOT NULL,
    "productTitle" TEXT,
    "budgetedAmountHTCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "rapportsOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BudgetLine" ("budgetedAmountHTCents", "createdAt", "id", "isActive", "notes", "order", "productTitle", "projectId", "rubrique", "updatedAt") SELECT "budgetedAmountHTCents", "createdAt", "id", "isActive", "notes", "order", "productTitle", "projectId", "rubrique", "updatedAt" FROM "BudgetLine";
DROP TABLE "BudgetLine";
ALTER TABLE "new_BudgetLine" RENAME TO "BudgetLine";
CREATE UNIQUE INDEX "BudgetLine_projectId_rubrique_productTitle_key" ON "BudgetLine"("projectId", "rubrique", "productTitle");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dashboardOrder" INTEGER NOT NULL DEFAULT 0,
    "rapportsOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("createdAt", "description", "id", "isActive", "name", "order", "updatedAt") SELECT "createdAt", "description", "id", "isActive", "name", "order", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
