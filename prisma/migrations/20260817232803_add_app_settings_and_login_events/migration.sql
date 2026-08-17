-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "localAuthEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ip" TEXT,
    "location" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_email_idx" ON "LoginEvent"("email");
