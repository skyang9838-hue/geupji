-- CreateTable
CREATE TABLE "Complex" (
    "aptSeq" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sggCd" TEXT NOT NULL,
    "umdName" TEXT NOT NULL,
    "jibun" TEXT,
    "roadName" TEXT,
    "buildYear" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complex_pkey" PRIMARY KEY ("aptSeq")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" SERIAL NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "occurrence" INTEGER NOT NULL,
    "aptSeq" TEXT NOT NULL,
    "sggCd" TEXT NOT NULL,
    "dealYm" TEXT NOT NULL,
    "dealDate" DATE NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "floor" INTEGER NOT NULL,
    "priceManwon" INTEGER NOT NULL,
    "dealingType" TEXT,
    "buyerType" TEXT,
    "sellerType" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledOn" DATE,
    "registeredOn" DATE,
    "aptDong" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edition" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "asOf" DATE NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lead" JSONB NOT NULL,
    "snapshots" JSONB NOT NULL,
    "events" JSONB NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestRun" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "requests" INTEGER NOT NULL DEFAULT 0,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "removed" INTEGER NOT NULL DEFAULT 0,
    "failures" JSONB,

    CONSTRAINT "IngestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingFetch" (
    "code" TEXT NOT NULL,
    "ym" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingFetch_pkey" PRIMARY KEY ("code","ym")
);

-- CreateIndex
CREATE INDEX "Complex_umdName_idx" ON "Complex"("umdName");

-- CreateIndex
CREATE INDEX "Trade_aptSeq_dealDate_idx" ON "Trade"("aptSeq", "dealDate");

-- CreateIndex
CREATE INDEX "Trade_sggCd_dealYm_idx" ON "Trade"("sggCd", "dealYm");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_sourceKey_occurrence_key" ON "Trade"("sourceKey", "occurrence");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_number_key" ON "Edition"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_asOf_key" ON "Edition"("asOf");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_aptSeq_fkey" FOREIGN KEY ("aptSeq") REFERENCES "Complex"("aptSeq") ON DELETE RESTRICT ON UPDATE CASCADE;
