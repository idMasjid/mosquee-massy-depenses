-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "rubrique" TEXT NOT NULL,
    "productTitle" TEXT,
    "budgetedAmountHTCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "legacyInitiatorName" TEXT,
    "submittedAt" DATETIME,
    "validatedById" TEXT,
    "validatedAt" DATETIME,
    "rejectedById" TEXT,
    "rejectedAt" DATETIME,
    "rejectionReason" TEXT,
    "realizedAt" DATETIME,
    "cancelledById" TEXT,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "entryDate" DATETIME NOT NULL,
    "orderDate" DATETIME,
    "supplierName" TEXT NOT NULL,
    "supplierIdentifier" TEXT,
    "orderNumber" TEXT,
    "purchaseType" TEXT,
    "invoiceDate" DATETIME,
    "invoiceNumber" TEXT,
    "invoiceLink" TEXT,
    "unitPriceHTCents" INTEGER,
    "quantity" REAL DEFAULT 1,
    "deliveryFeeCents" INTEGER DEFAULT 0,
    "importFeeCents" INTEGER DEFAULT 0,
    "discountCents" INTEGER DEFAULT 0,
    "totalHTCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER,
    "vatAmountCents" INTEGER,
    "totalTTCCents" INTEGER NOT NULL,
    "paymentType" TEXT,
    "paymentReference" TEXT,
    "productTitle" TEXT NOT NULL,
    "segment" TEXT,
    "rubriqueLabel" TEXT NOT NULL,
    "amazonService" TEXT,
    "legacyBudgetFilter" TEXT,
    "legacyColumn3" TEXT,
    "projectId" TEXT NOT NULL,
    "budgetLineId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseStatusEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "byUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseStatusEvent_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseStatusEvent_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_projectId_rubrique_productTitle_key" ON "BudgetLine"("projectId", "rubrique", "productTitle");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_projectId_idx" ON "Expense"("projectId");

-- CreateIndex
CREATE INDEX "Expense_budgetLineId_idx" ON "Expense"("budgetLineId");

-- CreateIndex
CREATE INDEX "Expense_entryDate_idx" ON "Expense"("entryDate");
