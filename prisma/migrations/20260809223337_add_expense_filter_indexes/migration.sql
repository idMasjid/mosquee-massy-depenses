-- CreateIndex
CREATE INDEX "Expense_invoiceDate_idx" ON "Expense"("invoiceDate");

-- CreateIndex
CREATE INDEX "Expense_supplierName_idx" ON "Expense"("supplierName");

-- CreateIndex
CREATE INDEX "Expense_paymentType_idx" ON "Expense"("paymentType");

-- CreateIndex
CREATE INDEX "Expense_purchaseType_idx" ON "Expense"("purchaseType");

-- CreateIndex
CREATE INDEX "Expense_rubriqueLabel_idx" ON "Expense"("rubriqueLabel");
