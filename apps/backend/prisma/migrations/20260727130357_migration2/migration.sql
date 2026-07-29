/*
  Warnings:

  - The values [SELLER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `googleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AuthProviderType" AS ENUM ('EMAIL', 'PHONE');

-- AlterEnum
ALTER TYPE "OtpType" ADD VALUE 'USER_INVITE';

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('BUYER', 'ADMIN', 'MODERATOR');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'BUYER';
COMMIT;

-- DropIndex
DROP INDEX "User_googleId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "googleId",
DROP COLUMN "passwordHash",
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AuthProviderType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "secret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthProvider_userId_idx" ON "AuthProvider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthProvider_type_identifier_key" ON "AuthProvider"("type", "identifier");

-- AddForeignKey
ALTER TABLE "AuthProvider" ADD CONSTRAINT "AuthProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
