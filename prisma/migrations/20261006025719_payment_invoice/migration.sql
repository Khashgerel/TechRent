-- CreateEnum
CREATE TYPE "PaymentProviderKind" AS ENUM ('QPAY_SANDBOX', 'QPAY_PRODUCTION');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('WALLET_TOPUP');

-- CreateEnum
CREATE TYPE "PaymentInvoiceStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'FAILED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WALLET_TOPPED_UP';

-- CreateTable
CREATE TABLE "PaymentInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProviderKind" NOT NULL DEFAULT 'QPAY_SANDBOX',
    "purpose" "PaymentPurpose" NOT NULL DEFAULT 'WALLET_TOPUP',
    "status" "PaymentInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "senderInvoiceNo" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" INTEGER NOT NULL,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "qrText" TEXT,
    "qrImage" TEXT,
    "shortUrl" TEXT,
    "deeplinks" JSONB,
    "qpayPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "ledgerTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_senderInvoiceNo_key" ON "PaymentInvoice"("senderInvoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_invoiceId_key" ON "PaymentInvoice"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInvoice_ledgerTransactionId_key" ON "PaymentInvoice"("ledgerTransactionId");

-- CreateIndex
CREATE INDEX "PaymentInvoice_userId_createdAt_idx" ON "PaymentInvoice"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentInvoice_status_idx" ON "PaymentInvoice"("status");

-- AddForeignKey
ALTER TABLE "PaymentInvoice" ADD CONSTRAINT "PaymentInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

