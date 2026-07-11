-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "residency_status" AS ENUM ('british_citizen', 'settled_status', 'pre_settled_status', 'student_visa', 'work_visa', 'refugee', 'asylum_seeker', 'other');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('employed_full_time', 'employed_part_time', 'self_employed', 'gig_worker', 'student', 'graduate', 'unemployed', 'other');

-- CreateEnum
CREATE TYPE "profile_stage" AS ENUM ('created', 'onboarding', 'profile_building', 'banking_connected', 'documents_uploaded', 'scored', 'complete');

-- CreateEnum
CREATE TYPE "pay_frequency" AS ENUM ('weekly', 'fortnightly', 'monthly', 'irregular');

-- CreateEnum
CREATE TYPE "contract_type" AS ENUM ('permanent', 'fixed_term', 'zero_hours', 'freelance', 'other');

-- CreateEnum
CREATE TYPE "connection_status" AS ENUM ('pending', 'active', 'expired', 'error');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('current', 'savings', 'credit_card', 'business');

-- CreateEnum
CREATE TYPE "transaction_direction" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "transaction_category" AS ENUM ('salary', 'rent_payment', 'groceries', 'transport', 'utilities', 'savings_transfer', 'loan_repayment', 'entertainment', 'healthcare', 'education', 'gig_income', 'government_benefit', 'investment', 'cash_withdrawal', 'other');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('passport', 'national_id', 'biometric_residence_permit', 'driving_licence', 'bank_statement', 'payslip', 'employment_letter', 'tenancy_agreement', 'utility_bill', 'p60', 'p45', 'tax_return', 'other');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('pending', 'verified', 'rejected', 'needs_review');

-- CreateEnum
CREATE TYPE "scorecard_type" AS ENUM ('general', 'tenant', 'lender_readiness', 'telecom');

-- CreateEnum
CREATE TYPE "trust_tier" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "fraud_risk" AS ENUM ('pass', 'review', 'high_risk');

-- CreateEnum
CREATE TYPE "statement_import_job_status" AS ENUM ('processing', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "commitment_status" AS ENUM ('active', 'inactive', 'unknown');

-- CreateEnum
CREATE TYPE "reminder_type" AS ENUM ('renewal', 'review', 'free_trial', 'custom');

-- CreateEnum
CREATE TYPE "reminder_status" AS ENUM ('scheduled', 'completed', 'dismissed');

-- CreateEnum
CREATE TYPE "goal_type" AS ENUM ('emergency_buffer', 'custom');

-- CreateEnum
CREATE TYPE "goal_status" AS ENUM ('active', 'achieved', 'archived');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "auth_provider_id" TEXT NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "compass_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT,
    "dob" TIMESTAMP(3),
    "nationality" TEXT,
    "residency_status" "residency_status",
    "uk_move_date" TIMESTAMP(3),
    "employment_type" "employment_type",
    "monthly_income_declared" DOUBLE PRECISION,
    "monthly_rent_declared" DOUBLE PRECISION,
    "profile_stage" "profile_stage" NOT NULL DEFAULT 'created',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GB',
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "employment_type" "employment_type" NOT NULL,
    "employer_name" TEXT,
    "job_title" TEXT,
    "monthly_income_declared" DOUBLE PRECISION,
    "pay_frequency" "pay_frequency",
    "contract_type" "contract_type",
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "provider_account_id" TEXT,
    "institution_name" TEXT,
    "connection_status" "connection_status" NOT NULL DEFAULT 'pending',
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "consent_id" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "bank_connection_id" TEXT NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "account_name" TEXT,
    "account_holder_name" TEXT,
    "account_type" "account_type" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "masked_account_number" TEXT,
    "current_balance" DOUBLE PRECISION,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_debits" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT,
    "reference" TEXT,
    "previous_amount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" TEXT NOT NULL DEFAULT 'active',
    "previous_payment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_debits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standing_orders" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "reference" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "frequency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "next_payment_date" TIMESTAMP(3),
    "next_payment_amount" DOUBLE PRECISION,
    "first_payment_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "external_txn_id" TEXT NOT NULL,
    "booked_at" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "description" TEXT,
    "merchant_name" TEXT,
    "category" "transaction_category",
    "direction" "transaction_direction" NOT NULL,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_type" "document_type" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "mime_type" TEXT,
    "verification_status" "verification_status" NOT NULL DEFAULT 'pending',
    "extracted_metadata" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "uploaded_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "monthly_rent_declared" DOUBLE PRECISION,
    "landlord_name" TEXT,
    "tenancy_start_date" TIMESTAMP(3),
    "tenancy_end_date" TIMESTAMP(3),
    "property_address" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_features" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "feature_value_num" DOUBLE PRECISION,
    "feature_value_text" TEXT,
    "feature_value_bool" BOOLEAN,
    "score_version" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scorecard_type" "scorecard_type" NOT NULL,
    "score_version" TEXT NOT NULL,
    "profile_completeness_score" DOUBLE PRECISION NOT NULL,
    "verification_strength_score" DOUBLE PRECISION NOT NULL,
    "identity_confidence_score" DOUBLE PRECISION NOT NULL,
    "income_stability_score" DOUBLE PRECISION NOT NULL,
    "affordability_score" DOUBLE PRECISION NOT NULL,
    "rental_reliability_score" DOUBLE PRECISION NOT NULL,
    "financial_stability_score" DOUBLE PRECISION NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "overall_tier" "trust_tier" NOT NULL,
    "fraud_risk" "fraud_risk" NOT NULL,
    "reason_codes" JSONB NOT NULL,
    "financial_data_as_of" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "evidence_manifest" JSONB,
    "feature_snapshot" JSONB,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trust_score_id" TEXT NOT NULL,
    "share_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "target_type" TEXT,
    "target_name" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "insight_snapshot" JSONB,

    CONSTRAINT "shared_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_import_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "statement_import_job_status" NOT NULL DEFAULT 'processing',
    "source_type" TEXT NOT NULL DEFAULT 'pdf',
    "file_name" TEXT,
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "statement_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_question_answers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_question_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profile_type" TEXT NOT NULL,
    "use_case" TEXT,
    "current_country" TEXT,
    "last_country" TEXT,
    "org_type" TEXT,
    "intended_use" TEXT,
    "applicant_volume" TEXT,
    "problem_statement" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL DEFAULT 'user',
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitment_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "commitment_key" TEXT NOT NULL,
    "status" "commitment_status" NOT NULL DEFAULT 'active',
    "renewal_date" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "commitment_key" TEXT,
    "type" "reminder_type" NOT NULL DEFAULT 'renewal',
    "title" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "trigger_at" TIMESTAMP(3) NOT NULL,
    "offset_days" INTEGER[],
    "status" "reminder_status" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "goal_type" NOT NULL DEFAULT 'emergency_buffer',
    "label" TEXT,
    "target_amount" DOUBLE PRECISION NOT NULL,
    "target_months" INTEGER,
    "monthly_contribution" DOUBLE PRECISION,
    "status" "goal_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compass_dismissals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compass_dismissals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_id_key" ON "users"("auth_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_bank_connection_id_external_account_id_key" ON "bank_accounts"("bank_connection_id", "external_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_debits_bank_account_id_external_id_key" ON "direct_debits"("bank_account_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "standing_orders_bank_account_id_external_id_key" ON "standing_orders"("bank_account_id", "external_id");

-- CreateIndex
CREATE INDEX "bank_transactions_bank_account_id_booked_at_idx" ON "bank_transactions"("bank_account_id", "booked_at");

-- CreateIndex
CREATE INDEX "bank_transactions_category_idx" ON "bank_transactions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_bank_account_id_external_txn_id_key" ON "bank_transactions"("bank_account_id", "external_txn_id");

-- CreateIndex
CREATE INDEX "trust_features_user_id_feature_key_idx" ON "trust_features"("user_id", "feature_key");

-- CreateIndex
CREATE INDEX "trust_scores_user_id_computed_at_idx" ON "trust_scores"("user_id", "computed_at");

-- CreateIndex
CREATE UNIQUE INDEX "shared_profiles_share_token_key" ON "shared_profiles"("share_token");

-- CreateIndex
CREATE INDEX "statement_import_jobs_user_id_created_at_idx" ON "statement_import_jobs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "insight_question_answers_user_id_question_id_key" ON "insight_question_answers"("user_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE INDEX "audit_events_user_id_created_at_idx" ON "audit_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_event_type_idx" ON "audit_events"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "commitment_settings_user_id_commitment_key_key" ON "commitment_settings"("user_id", "commitment_key");

-- CreateIndex
CREATE INDEX "reminders_user_id_status_idx" ON "reminders"("user_id", "status");

-- CreateIndex
CREATE INDEX "savings_goals_user_id_status_idx" ON "savings_goals"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "compass_dismissals_user_id_kind_key_key" ON "compass_dismissals"("user_id", "kind", "key");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_profiles" ADD CONSTRAINT "employment_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_connection_id_fkey" FOREIGN KEY ("bank_connection_id") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_debits" ADD CONSTRAINT "direct_debits_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_orders" ADD CONSTRAINT "standing_orders_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_profiles" ADD CONSTRAINT "rental_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_features" ADD CONSTRAINT "trust_features_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_profiles" ADD CONSTRAINT "shared_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_profiles" ADD CONSTRAINT "shared_profiles_trust_score_id_fkey" FOREIGN KEY ("trust_score_id") REFERENCES "trust_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_import_jobs" ADD CONSTRAINT "statement_import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_question_answers" ADD CONSTRAINT "insight_question_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitment_settings" ADD CONSTRAINT "commitment_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compass_dismissals" ADD CONSTRAINT "compass_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

