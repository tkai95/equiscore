-- Statement ingestion rewrite: provenance + ledger evidence + real state machine.
--
-- All changes are additive (new nullable/defaulted columns + one new enum), so
-- existing rows are unaffected and the migration is safe to apply on a live DB.
--
-- BankTransaction: persist the running balance (previously verified at ingest
-- then dropped) + source provenance (page/row) + extractor/version, so the
-- ledger is re-verifiable from the database and every value is traceable to
-- its source.
--
-- StatementImportJob: a real processing state machine (`stage`) replacing the
-- opaque `status=processing` bucket, plus the full validation result object
-- and source-assurance / extractor provenance.

-- CreateEnum
CREATE TYPE "statement_import_stage" AS ENUM ('uploaded', 'preflight', 'classified', 'extracting', 'normalising', 'validating', 'resolving', 'verified', 'analysing', 'complete', 'needs_better_source', 'unsupported_format', 'unresolved_extraction', 'provider_error');

-- AlterTable: BankTransaction provenance + ledger evidence
ALTER TABLE "bank_transactions" ADD COLUMN     "balance" DOUBLE PRECISION,
ADD COLUMN     "extractor" TEXT,
ADD COLUMN     "extractor_version" TEXT,
ADD COLUMN     "source_page" INTEGER,
ADD COLUMN     "source_row" INTEGER;

-- AlterTable: StatementImportJob state machine + validation + assurance
ALTER TABLE "statement_import_jobs" ADD COLUMN     "extractor" TEXT,
ADD COLUMN     "extractor_version" TEXT,
ADD COLUMN     "source_assurance" TEXT,
ADD COLUMN     "stage" "statement_import_stage" NOT NULL DEFAULT 'uploaded',
ADD COLUMN     "validation" JSONB;
