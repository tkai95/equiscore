-- CreateEnum
CREATE TYPE "organisation_status" AS ENUM ('active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "organisation_member_role" AS ENUM ('owner', 'admin', 'policy_admin', 'reviewer', 'manager', 'billing_admin', 'auditor');

-- CreateEnum
CREATE TYPE "organisation_member_status" AS ENUM ('invited', 'active', 'suspended', 'removed');

-- CreateEnum
CREATE TYPE "company_assessment_type" AS ENUM ('rental', 'telecom', 'utilities', 'lending', 'other');

-- CreateEnum
CREATE TYPE "assessment_request_status" AS ENUM ('draft', 'invitation_scheduled', 'invitation_sent', 'applicant_opened', 'applicant_started', 'information_incomplete', 'awaiting_consent', 'ready_for_assessment', 'assessment_delivered', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "company_consent_status" AS ENUM ('pending', 'granted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "policy_status" AS ENUM ('draft', 'active', 'retired');

-- CreateEnum
CREATE TYPE "policy_version_status" AS ENUM ('draft', 'awaiting_approval', 'approved', 'active', 'retired');

-- CreateEnum
CREATE TYPE "assessment_source" AS ENUM ('user_shared', 'company_requested', 'api', 'refresh');

-- CreateEnum
CREATE TYPE "assessment_case_status" AS ENUM ('pending_share', 'draft_request', 'invitation_sent', 'applicant_started', 'information_incomplete', 'awaiting_consent', 'ready_for_assessment', 'assessment_ready', 'under_review', 'information_requested', 'applicant_responded', 'escalated', 'review_complete', 'company_decision_recorded', 'refresh_requested', 'expired', 'archived', 'cancelled');

-- CreateEnum
CREATE TYPE "assessment_outcome" AS ENUM ('meets_criteria', 'review_required', 'information_required', 'alternative_route_recommended', 'unable_to_assess');

-- CreateEnum
CREATE TYPE "assessment_confidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "criterion_result_status" AS ENUM ('pass', 'fail', 'review', 'missing', 'not_applicable');

-- CreateEnum
CREATE TYPE "case_note_visibility" AS ENUM ('internal', 'applicant_visible');

-- CreateEnum
CREATE TYPE "information_request_status" AS ENUM ('open', 'applicant_responded', 'resolved', 'cancelled');

-- CreateEnum
CREATE TYPE "company_decision" AS ENUM ('approved', 'approved_with_conditions', 'additional_information_required', 'guarantor_or_alternative_route_required', 'referred_for_manual_review', 'declined', 'withdrawn', 'expired_without_decision');

-- CreateEnum
CREATE TYPE "usage_event_type" AS ENUM ('assessment_delivered', 'shared_profile_accepted', 'assessment_refreshed', 'assessment_api_delivered', 'manual_credit_granted', 'usage_event_reversed');

-- CreateEnum
CREATE TYPE "usage_unit" AS ENUM ('assessment_credit');

-- CreateEnum
CREATE TYPE "usage_billing_classification" AS ENUM ('included', 'overage', 'manual', 'reversed');

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "organisation_status" NOT NULL DEFAULT 'active',
    "plan_name" TEXT,
    "monthly_assessment_allowance" INTEGER NOT NULL DEFAULT 0,
    "overage_unit_price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_members" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "organisation_member_role" NOT NULL DEFAULT 'reviewer',
    "status" "organisation_member_status" NOT NULL DEFAULT 'active',
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_requests" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "applicant_id" TEXT,
    "applicant_email" TEXT NOT NULL,
    "applicant_name" TEXT,
    "assessment_type" "company_assessment_type" NOT NULL,
    "policy_version_id" TEXT,
    "proposed_commitment" DOUBLE PRECISION,
    "reference" TEXT,
    "status" "assessment_request_status" NOT NULL DEFAULT 'draft',
    "request_token" TEXT,
    "deadline" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "assessment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_consents" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "assessment_request_id" TEXT,
    "shared_profile_id" TEXT,
    "assessment_type" "company_assessment_type" NOT NULL,
    "purpose" TEXT,
    "permitted_data_scope" JSONB NOT NULL,
    "consent_text_version" TEXT NOT NULL,
    "status" "company_consent_status" NOT NULL DEFAULT 'granted',
    "granted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "company_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_snapshots" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "consent_id" TEXT NOT NULL,
    "snapshot_version" INTEGER NOT NULL,
    "data_period_start" TIMESTAMP(3),
    "data_period_end" TIMESTAMP(3),
    "source_freshness" TEXT,
    "permitted_data_scope" JSONB NOT NULL,
    "trust_score_summary" JSONB NOT NULL,
    "insight_summary" JSONB NOT NULL,
    "income_summary" JSONB NOT NULL,
    "affordability_summary" JSONB NOT NULL,
    "commitments_summary" JSONB NOT NULL,
    "verification_summary" JSONB NOT NULL,
    "evidence_manifest" JSONB,
    "evidence_references" JSONB,
    "integrity_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assessment_type" "company_assessment_type" NOT NULL,
    "status" "policy_status" NOT NULL DEFAULT 'draft',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "policy_version_status" NOT NULL DEFAULT 'draft',
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_by_id" TEXT,
    "approved_by_id" TEXT,
    "source_document_reference" TEXT,
    "change_summary" TEXT,
    "test_results" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_rules" (
    "id" TEXT NOT NULL,
    "policy_version_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "input_field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" JSONB,
    "threshold_type" TEXT,
    "evidence_period_months" INTEGER,
    "missing_data_behaviour" TEXT NOT NULL DEFAULT 'review',
    "confidence_requirement" TEXT,
    "pass_outcome" TEXT NOT NULL,
    "fail_outcome" TEXT NOT NULL,
    "alternative_pathway" TEXT,
    "human_review_required" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),

    CONSTRAINT "policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_cases" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "assessment_request_id" TEXT,
    "source" "assessment_source" NOT NULL,
    "assessment_type" "company_assessment_type" NOT NULL,
    "policy_version_id" TEXT,
    "assessment_snapshot_id" TEXT NOT NULL,
    "consent_id" TEXT NOT NULL,
    "status" "assessment_case_status" NOT NULL DEFAULT 'assessment_ready',
    "assessment_outcome" "assessment_outcome",
    "assessment_confidence" "assessment_confidence",
    "reviewer_id" TEXT,
    "company_decision" "company_decision",
    "decision_rationale" TEXT,
    "reference" TEXT,
    "proposed_commitment" DOUBLE PRECISION,
    "credit_consumed" BOOLEAN NOT NULL DEFAULT false,
    "assessed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterion_results" (
    "id" TEXT NOT NULL,
    "assessment_case_id" TEXT NOT NULL,
    "policy_rule_id" TEXT,
    "result" "criterion_result_status" NOT NULL,
    "observed_value" JSONB,
    "threshold_value" JSONB,
    "confidence" "assessment_confidence",
    "evidence_references" JSONB,
    "assumptions" JSONB,
    "missing_information" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "criterion_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_notes" (
    "id" TEXT NOT NULL,
    "assessment_case_id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "visibility" "case_note_visibility" NOT NULL DEFAULT 'internal',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "information_requests" (
    "id" TEXT NOT NULL,
    "assessment_case_id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "requested_fields" JSONB,
    "status" "information_request_status" NOT NULL DEFAULT 'open',
    "due_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "applicant_response" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "information_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_decisions" (
    "id" TEXT NOT NULL,
    "assessment_case_id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "decision" "company_decision" NOT NULL,
    "conditions" JSONB,
    "rationale" TEXT NOT NULL,
    "decision_maker_id" TEXT NOT NULL,
    "assessment_outcome_at_decision" "assessment_outcome",
    "override_flag" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "assessment_case_id" TEXT,
    "assessment_snapshot_id" TEXT,
    "applicant_id" TEXT,
    "event_type" "usage_event_type" NOT NULL,
    "source" "assessment_source",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" "usage_unit" NOT NULL DEFAULT 'assessment_credit',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billing_period_start" TIMESTAMP(3),
    "billing_period_end" TIMESTAMP(3),
    "pricing_plan_id" TEXT,
    "included_or_overage" "usage_billing_classification",
    "unit_price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "initiated_by_user_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "reversal_of_event_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_audit_events" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "assessment_case_id" TEXT,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "before_state_reference" TEXT,
    "after_state_reference" TEXT,
    "ip_address" TEXT,
    "session_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE INDEX "organisation_members_user_id_status_idx" ON "organisation_members"("user_id", "status");

-- CreateIndex
CREATE INDEX "organisation_members_organisation_id_role_idx" ON "organisation_members"("organisation_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_members_organisation_id_user_id_key" ON "organisation_members"("organisation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_requests_request_token_key" ON "assessment_requests"("request_token");

-- CreateIndex
CREATE INDEX "assessment_requests_organisation_id_status_idx" ON "assessment_requests"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "assessment_requests_applicant_email_idx" ON "assessment_requests"("applicant_email");

-- CreateIndex
CREATE INDEX "company_consents_organisation_id_status_idx" ON "company_consents"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "company_consents_applicant_id_status_idx" ON "company_consents"("applicant_id", "status");

-- CreateIndex
CREATE INDEX "assessment_snapshots_organisation_id_created_at_idx" ON "assessment_snapshots"("organisation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_snapshots_organisation_id_applicant_id_snapshot__key" ON "assessment_snapshots"("organisation_id", "applicant_id", "snapshot_version");

-- CreateIndex
CREATE INDEX "policies_organisation_id_assessment_type_status_idx" ON "policies"("organisation_id", "assessment_type", "status");

-- CreateIndex
CREATE INDEX "policy_versions_organisation_id_status_idx" ON "policy_versions"("organisation_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "policy_versions_policy_id_version_number_key" ON "policy_versions"("policy_id", "version_number");

-- CreateIndex
CREATE INDEX "policy_rules_policy_version_id_priority_idx" ON "policy_rules"("policy_version_id", "priority");

-- CreateIndex
CREATE INDEX "assessment_cases_organisation_id_status_idx" ON "assessment_cases"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "assessment_cases_organisation_id_assessment_type_idx" ON "assessment_cases"("organisation_id", "assessment_type");

-- CreateIndex
CREATE INDEX "assessment_cases_applicant_id_created_at_idx" ON "assessment_cases"("applicant_id", "created_at");

-- CreateIndex
CREATE INDEX "criterion_results_assessment_case_id_result_idx" ON "criterion_results"("assessment_case_id", "result");

-- CreateIndex
CREATE INDEX "case_notes_organisation_id_assessment_case_id_idx" ON "case_notes"("organisation_id", "assessment_case_id");

-- CreateIndex
CREATE INDEX "information_requests_assessment_case_id_status_idx" ON "information_requests"("assessment_case_id", "status");

-- CreateIndex
CREATE INDEX "case_decisions_organisation_id_created_at_idx" ON "case_decisions"("organisation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_idempotency_key_key" ON "usage_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "usage_events_organisation_id_occurred_at_idx" ON "usage_events"("organisation_id", "occurred_at");

-- CreateIndex
CREATE INDEX "usage_events_assessment_case_id_idx" ON "usage_events"("assessment_case_id");

-- CreateIndex
CREATE INDEX "organisation_audit_events_organisation_id_created_at_idx" ON "organisation_audit_events"("organisation_id", "created_at");

-- CreateIndex
CREATE INDEX "organisation_audit_events_assessment_case_id_created_at_idx" ON "organisation_audit_events"("assessment_case_id", "created_at");

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_requests" ADD CONSTRAINT "assessment_requests_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_requests" ADD CONSTRAINT "assessment_requests_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_requests" ADD CONSTRAINT "assessment_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_requests" ADD CONSTRAINT "assessment_requests_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_consents" ADD CONSTRAINT "company_consents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_consents" ADD CONSTRAINT "company_consents_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_consents" ADD CONSTRAINT "company_consents_assessment_request_id_fkey" FOREIGN KEY ("assessment_request_id") REFERENCES "assessment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_consents" ADD CONSTRAINT "company_consents_shared_profile_id_fkey" FOREIGN KEY ("shared_profile_id") REFERENCES "shared_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_snapshots" ADD CONSTRAINT "assessment_snapshots_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_snapshots" ADD CONSTRAINT "assessment_snapshots_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_snapshots" ADD CONSTRAINT "assessment_snapshots_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "company_consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_rules" ADD CONSTRAINT "policy_rules_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_cases" ADD CONSTRAINT "assessment_cases_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_cases" ADD CONSTRAINT "assessment_cases_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_cases" ADD CONSTRAINT "assessment_cases_assessment_request_id_fkey" FOREIGN KEY ("assessment_request_id") REFERENCES "assessment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_cases" ADD CONSTRAINT "assessment_cases_policy_version_id_fkey" FOREIGN KEY ("policy_version_id") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_cases" ADD CONSTRAINT "assessment_cases_assessment_snapshot_id_fkey" FOREIGN KEY ("assessment_snapshot_id") REFERENCES "assessment_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_cases" ADD CONSTRAINT "assessment_cases_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "company_consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_cases" ADD CONSTRAINT "assessment_cases_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_results" ADD CONSTRAINT "criterion_results_assessment_case_id_fkey" FOREIGN KEY ("assessment_case_id") REFERENCES "assessment_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_results" ADD CONSTRAINT "criterion_results_policy_rule_id_fkey" FOREIGN KEY ("policy_rule_id") REFERENCES "policy_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_assessment_case_id_fkey" FOREIGN KEY ("assessment_case_id") REFERENCES "assessment_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "information_requests" ADD CONSTRAINT "information_requests_assessment_case_id_fkey" FOREIGN KEY ("assessment_case_id") REFERENCES "assessment_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_decisions" ADD CONSTRAINT "case_decisions_assessment_case_id_fkey" FOREIGN KEY ("assessment_case_id") REFERENCES "assessment_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_decisions" ADD CONSTRAINT "case_decisions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_decisions" ADD CONSTRAINT "case_decisions_decision_maker_id_fkey" FOREIGN KEY ("decision_maker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_assessment_case_id_fkey" FOREIGN KEY ("assessment_case_id") REFERENCES "assessment_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_assessment_snapshot_id_fkey" FOREIGN KEY ("assessment_snapshot_id") REFERENCES "assessment_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_reversal_of_event_id_fkey" FOREIGN KEY ("reversal_of_event_id") REFERENCES "usage_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_audit_events" ADD CONSTRAINT "organisation_audit_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_audit_events" ADD CONSTRAINT "organisation_audit_events_assessment_case_id_fkey" FOREIGN KEY ("assessment_case_id") REFERENCES "assessment_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

