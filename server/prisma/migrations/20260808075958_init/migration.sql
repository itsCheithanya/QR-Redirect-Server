-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "title" TEXT,
    "qrImagePath" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "redirectId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "ipHash" TEXT,
    "country" TEXT,
    "device" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "referer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_path_key" ON "Redirect"("path");

-- CreateIndex
CREATE INDEX "Redirect_enabled_idx" ON "Redirect"("enabled");

-- CreateIndex
CREATE INDEX "ScanEvent_redirectId_createdAt_idx" ON "ScanEvent"("redirectId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanEvent_visitorId_idx" ON "ScanEvent"("visitorId");

-- AddForeignKey
ALTER TABLE "Redirect" ADD CONSTRAINT "Redirect_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_redirectId_fkey" FOREIGN KEY ("redirectId") REFERENCES "Redirect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
