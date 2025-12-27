-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."PromoVolume" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."RaceOutcome" AS ENUM ('WIN', 'LOSS', 'BONUS', 'DEAD_HEAT', 'MIDDLE', 'REFUND', 'PENDING', 'SCRATCHED');

-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."TimeValidationStatus" AS ENUM ('PENDING', 'VERIFIED', 'MISMATCH', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "public"."UnitTier" AS ENUM ('GREEN', 'NEUTRAL', 'PINK');

-- CreateTable
CREATE TABLE "public"."Bookie" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "signUpOffers" TEXT,
    "linkedBookies" TEXT,
    "accountSetupNotes" TEXT,
    "promoVolume" "public"."PromoVolume",
    "banRisk" "public"."RiskLevel",
    "defenceNotes" TEXT,
    "horseSystem" TEXT,
    "sportSystem" TEXT,
    "femaleAccounts" TEXT,
    "statDecRisk" "public"."RiskLevel",
    "learnBetfairFirst" TEXT,
    "oddsRating" TEXT,
    "minimumRunners" TEXT,
    "website" TEXT,
    "bookieSoftware" TEXT,
    "stateOfRegistration" TEXT,
    "isExchange" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookieNote" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "bookieId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookieNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommissionPreference" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "defaultRate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LayManagerEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "raceNumber" INTEGER NOT NULL,
    "meetingId" INTEGER,
    "selectionName" TEXT NOT NULL,
    "selectionNumber" INTEGER NOT NULL,
    "selectedNormalBookies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedBetBackBookies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promoDetails" JSONB NOT NULL DEFAULT '{}',
    "backBookie" TEXT NOT NULL,
    "backStake" DECIMAL(10,2) NOT NULL,
    "backOdds" DECIMAL(8,3) NOT NULL,
    "backCommissionPercent" DECIMAL(5,2),
    "layBookie" TEXT NOT NULL DEFAULT 'Betfair',
    "layStake" DECIMAL(10,2) NOT NULL,
    "layOdds" DECIMAL(8,3) NOT NULL,
    "layCommissionPercent" DECIMAL(5,2),
    "unitTier" "public"."UnitTier" NOT NULL DEFAULT 'NEUTRAL',
    "autoResult" JSONB,
    "lastPolledAt" TIMESTAMP(3),
    "pollAttempts" INTEGER NOT NULL DEFAULT 0,
    "outcome" "public"."RaceOutcome" NOT NULL DEFAULT 'PENDING',
    "outcomeNotes" TEXT,
    "profitLoss" DECIMAL(10,2),
    "lockedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LayManagerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RacingPlanEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "track" TEXT NOT NULL,
    "raceNumber" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "skip" BOOLEAN NOT NULL DEFAULT false,
    "unitTier" "public"."UnitTier" NOT NULL DEFAULT 'NEUTRAL',
    "timeValidationStatus" "public"."TimeValidationStatus" NOT NULL DEFAULT 'PENDING',
    "apiTime" TEXT,
    "timeDifferenceMinutes" INTEGER,
    "normalPromosByBookie" JSONB NOT NULL DEFAULT '{}',
    "betBackPromosByBookie" JSONB NOT NULL DEFAULT '{}',
    "selectedNormalBookies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedBetBackBookies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RacingPlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RacingTrackerEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "planEntryId" TEXT,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "raceNumber" INTEGER NOT NULL,
    "meetingId" INTEGER,
    "selectionName" TEXT NOT NULL,
    "selectionNumber" INTEGER NOT NULL,
    "selectedNormalBookies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedBetBackBookies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promoDetails" JSONB NOT NULL DEFAULT '{}',
    "backBookie" TEXT NOT NULL,
    "backStake" DECIMAL(10,2) NOT NULL,
    "backOdds" DECIMAL(8,3) NOT NULL,
    "backCommissionPercent" DECIMAL(5,2),
    "layBookie" TEXT DEFAULT 'Betfair',
    "layStake" DECIMAL(10,2),
    "layOdds" DECIMAL(8,3),
    "layCommissionPercent" DECIMAL(5,2),
    "unitTier" "public"."UnitTier" NOT NULL DEFAULT 'NEUTRAL',
    "autoResult" JSONB,
    "lastPolledAt" TIMESTAMP(3),
    "pollAttempts" INTEGER NOT NULL DEFAULT 0,
    "outcome" "public"."RaceOutcome" NOT NULL DEFAULT 'PENDING',
    "outcomeNotes" TEXT,
    "profitLoss" DECIMAL(10,2),
    "lockedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RacingTrackerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StateCommissionRate" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultRate" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateCommissionRate_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."Track" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'AU',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookie_name_key" ON "public"."Bookie"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Bookie_normalizedName_key" ON "public"."Bookie"("normalizedName" ASC);

-- CreateIndex
CREATE INDEX "BookieNote_bookieId_idx" ON "public"."BookieNote"("bookieId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BookieNote_profileId_bookieId_key" ON "public"."BookieNote"("profileId" ASC, "bookieId" ASC);

-- CreateIndex
CREATE INDEX "BookieNote_profileId_idx" ON "public"."BookieNote"("profileId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPreference_profileId_key" ON "public"."CommissionPreference"("profileId" ASC);

-- CreateIndex
CREATE INDEX "LayManagerEntry_backBookie_idx" ON "public"."LayManagerEntry"("backBookie" ASC);

-- CreateIndex
CREATE INDEX "LayManagerEntry_date_idx" ON "public"."LayManagerEntry"("date" ASC);

-- CreateIndex
CREATE INDEX "LayManagerEntry_layBookie_idx" ON "public"."LayManagerEntry"("layBookie" ASC);

-- CreateIndex
CREATE INDEX "LayManagerEntry_outcome_idx" ON "public"."LayManagerEntry"("outcome" ASC);

-- CreateIndex
CREATE INDEX "LayManagerEntry_profileId_date_idx" ON "public"."LayManagerEntry"("profileId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "public"."Profile"("userId" ASC);

-- CreateIndex
CREATE INDEX "RacingPlanEntry_date_idx" ON "public"."RacingPlanEntry"("date" ASC);

-- CreateIndex
CREATE INDEX "RacingPlanEntry_profileId_date_idx" ON "public"."RacingPlanEntry"("profileId" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RacingPlanEntry_profileId_date_track_raceNumber_key" ON "public"."RacingPlanEntry"("profileId" ASC, "date" ASC, "track" ASC, "raceNumber" ASC);

-- CreateIndex
CREATE INDEX "RacingTrackerEntry_backBookie_idx" ON "public"."RacingTrackerEntry"("backBookie" ASC);

-- CreateIndex
CREATE INDEX "RacingTrackerEntry_date_idx" ON "public"."RacingTrackerEntry"("date" ASC);

-- CreateIndex
CREATE INDEX "RacingTrackerEntry_outcome_idx" ON "public"."RacingTrackerEntry"("outcome" ASC);

-- CreateIndex
CREATE INDEX "RacingTrackerEntry_profileId_date_idx" ON "public"."RacingTrackerEntry"("profileId" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Track_name_key" ON "public"."Track"("name" ASC);

-- CreateIndex
CREATE INDEX "Track_stateCode_idx" ON "public"."Track"("stateCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."BookieNote" ADD CONSTRAINT "BookieNote_bookieId_fkey" FOREIGN KEY ("bookieId") REFERENCES "public"."Bookie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookieNote" ADD CONSTRAINT "BookieNote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommissionPreference" ADD CONSTRAINT "CommissionPreference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LayManagerEntry" ADD CONSTRAINT "LayManagerEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RacingPlanEntry" ADD CONSTRAINT "RacingPlanEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RacingTrackerEntry" ADD CONSTRAINT "RacingTrackerEntry_planEntryId_fkey" FOREIGN KEY ("planEntryId") REFERENCES "public"."RacingPlanEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RacingTrackerEntry" ADD CONSTRAINT "RacingTrackerEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Track" ADD CONSTRAINT "Track_stateCode_fkey" FOREIGN KEY ("stateCode") REFERENCES "public"."StateCommissionRate"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

